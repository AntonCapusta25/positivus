package com.spoonful.pos.printer

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Build
import android.os.IBinder
import android.util.Log
import woyou.aidlservice.jiuiv5.ICallback
import woyou.aidlservice.jiuiv5.IWoyouService
import com.spoonful.pos.model.Order
import com.google.gson.JsonParser
import java.text.SimpleDateFormat
import java.util.Locale

class SunmiPrinterHelper(private val context: Context) {

    companion object {
        private const val TAG = "SunmiPrinterHelper"
        private const val PRINTER_SERVICE_PACKAGE = "woyou.aidlservice.jiuiv5"
        private const val PRINTER_SERVICE_ACTION = "woyou.aidlservice.jiuiv5.IWoyouService"
        private const val MAX_LINE_CHAR_58MM = 32   // 384 dots @ font 24
        private const val MAX_LINE_CHAR_80MM = 34   // 544 dots @ font 32 (extra large high-visibility typography for 80mm)
        private const val PRICE_COLUMNS_WIDTH = 12  // unit(6) + total(6)
        private const val QTY_COLUMN_WIDTH = 2

        const val PREF_PAPER_WIDTH = "receipt_paper_width"
        const val PAPER_AUTO = "auto"
        const val PAPER_58 = "58"
        const val PAPER_80 = "80"
    }

    /** Cached result of auto-detection (null = not yet detected). */
    private var detectedPaperMm: Int? = null

    /**
     * Best-effort detection of 80mm-capable Sunmi devices (V2s Plus, T2, T2s, K2, ...).
     * Can be overridden from the Receipts settings screen.
     */
    private fun detectPaperWidthMm(): Int {
        detectedPaperMm?.let { return it }
        val model = (Build.MODEL ?: "").uppercase(Locale.US)
        val printerModal = try {
            woyouService?.printerModal?.uppercase(Locale.US) ?: ""
        } catch (e: Exception) {
            ""
        }
        Log.d(TAG, "Detecting paper width. Build.MODEL=$model, printerModal=$printerModal")
        val is80 = model.contains("PLUS") || model.startsWith("T2") || model.startsWith("K2") ||
                printerModal.contains("80")
        val result = if (is80) 80 else 58
        if (woyouService != null) detectedPaperMm = result
        return result
    }

    /** Paper width in mm (58 or 80), honouring the user's override. */
    fun getPaperWidthMm(): Int {
        val pref = context.getSharedPreferences("spoonful_prefs", Context.MODE_PRIVATE)
            .getString(PREF_PAPER_WIDTH, PAPER_AUTO)
        return when (pref) {
            PAPER_58 -> 58
            PAPER_80 -> 80
            else -> detectPaperWidthMm()
        }
    }

    private fun lineCharsFor(paperMm: Int) = if (paperMm >= 80) MAX_LINE_CHAR_80MM else MAX_LINE_CHAR_58MM

    private var woyouService: IWoyouService? = null
    private var isBound = false

    interface PrinterBindListener {
        fun onPrinterBound(bound: Boolean)
    }

    private var bindListener: PrinterBindListener? = null

    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            woyouService = IWoyouService.Stub.asInterface(service)
            isBound = true
            Log.d(TAG, "Sunmi Printer Service connected.")
            bindListener?.onPrinterBound(true)
            
            // Initialize printer settings
            try {
                woyouService?.printerInit(null)
            } catch (e: Exception) {
                Log.e(TAG, "Error initializing printer", e)
            }
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            woyouService = null
            isBound = false
            Log.d(TAG, "Sunmi Printer Service disconnected.")
            bindListener?.onPrinterBound(false)
        }
    }

    fun bindPrinterService(listener: PrinterBindListener? = null) {
        if (isBound) {
            listener?.onPrinterBound(true)
            return
        }
        this.bindListener = listener
        try {
            val intent = Intent().apply {
                setPackage(PRINTER_SERVICE_PACKAGE)
                action = PRINTER_SERVICE_ACTION
            }
            val bindResult = context.bindService(intent, connection, Context.BIND_AUTO_CREATE)
            Log.d(TAG, "Binding result: $bindResult")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to bind to Sunmi printer service", e)
            listener?.onPrinterBound(false)
        }
    }

    fun unbindPrinterService() {
        if (isBound) {
            try {
                context.unbindService(connection)
            } catch (e: Exception) {
                Log.e(TAG, "Error unbinding printer service", e)
            }
            isBound = false
            woyouService = null
        }
    }

    fun isPrinterConnected(): Boolean {
        return woyouService != null
    }

    fun ensurePrinterBound(onReady: (IWoyouService?) -> Unit) {
        val currentService = woyouService
        if (currentService != null) {
            onReady(currentService)
            return
        }
        Log.d(TAG, "Printer not bound. Triggering bindPrinterService...")
        bindPrinterService(object : PrinterBindListener {
            override fun onPrinterBound(bound: Boolean) {
                onReady(if (bound) woyouService else null)
            }
        })
    }

    private val printCallback = object : ICallback.Stub() {
        override fun onRunResult(isSuccess: Boolean) {
            Log.d(TAG, "Print result success: $isSuccess")
        }

        override fun onReturnString(result: String?) {
            Log.d(TAG, "Print return string: $result")
        }

        override fun onRaiseException(code: Int, msg: String?) {
            Log.e(TAG, "Print exception: code=$code, msg=$msg")
        }
    }

    fun clearPrintBuffer() {
        val service = woyouService ?: return
        try {
            service.printerInit(printCallback)
            Log.d(TAG, "Printer buffer cleared/initialized.")
        } catch (e: Exception) {
            Log.e(TAG, "Error clearing print buffer", e)
        }
    }

    private fun sendText(service: IWoyouService, text: String) {
        val cleaned = text
            .replace("−", "-")
            .replace("—", "-")
            .replace("’", "'")
            .replace("‘", "'")
            .replace("”", "\"")
            .replace("“", "\"")
            .replace("█", "")
            .replace("▀", "")
            .replace("▄", "")
        try {
            service.printText(cleaned, printCallback)
        } catch (e: Exception) {
            Log.e(TAG, "Error printing text", e)
        }
    }

    private fun parseCustomerNotes(rawNotes: String?): String {
        if (rawNotes.isNullOrEmpty()) return ""
        return try {
            var obj = JsonParser.parseString(rawNotes).asJsonObject
            if (obj.has("payload") && obj.get("payload").isJsonObject) {
                obj = obj.getAsJsonObject("payload")
            }
            val orderComment = if (obj.has("order_comment") && !obj.get("order_comment").isJsonNull) obj.get("order_comment").asString ?: "" else ""
            val notesVal = if (obj.has("notes") && !obj.get("notes").isJsonNull) obj.get("notes").asString ?: "" else ""
            val orderInst = if (obj.has("order_instruction") && !obj.get("order_instruction").isJsonNull) obj.get("order_instruction").asString ?: "" else ""
            
            val deliveryInst = if (obj.has("delivery_instructions") && obj.get("delivery_instructions").isJsonArray) {
                val arr = obj.getAsJsonArray("delivery_instructions")
                val list = mutableListOf<String>()
                for (i in 0 until arr.size()) {
                    val instObj = arr.get(i).asJsonObject
                    if (instObj.has("instruction") && !instObj.get("instruction").isJsonNull) {
                        instObj.get("instruction").asString?.let { list.add(it) }
                    }
                }
                list.joinToString(", ")
            } else ""

            listOf(orderComment, notesVal, orderInst, deliveryInst)
                .filter { it.isNotEmpty() }
                .joinToString("\n")
        } catch (e: Exception) {
            if (rawNotes.trim().startsWith("{")) "" else rawNotes
        }
    }

    private fun parseDeliveryLandmark(rawNotes: String?): String? {
        if (rawNotes.isNullOrEmpty()) return null
        return try {
            var obj = JsonParser.parseString(rawNotes).asJsonObject
            if (obj.has("payload") && obj.get("payload").isJsonObject) {
                obj = obj.getAsJsonObject("payload")
            }
            val addr = if (obj.has("delivery_address") && obj.get("delivery_address").isJsonObject) {
                obj.getAsJsonObject("delivery_address")
            } else if (obj.has("address") && obj.get("address").isJsonObject) {
                obj.getAsJsonObject("address")
            } else null

            val landmark = addr?.get("landmark")?.takeIf { !it.isJsonNull }?.asString?.trim()
            if (landmark.isNullOrEmpty()) null else landmark
        } catch (e: Exception) {
            null
        }
    }

    private fun parseDeliveryAddressFallback(rawNotes: String?): String? {
        if (rawNotes.isNullOrEmpty()) return null
        return try {
            var obj = JsonParser.parseString(rawNotes).asJsonObject
            if (obj.has("payload") && obj.get("payload").isJsonObject) {
                obj = obj.getAsJsonObject("payload")
            }
            val addr = if (obj.has("delivery_address") && obj.get("delivery_address").isJsonObject) {
                obj.getAsJsonObject("delivery_address")
            } else if (obj.has("address") && obj.get("address").isJsonObject) {
                obj.getAsJsonObject("address")
            } else null ?: return null

            val addressVal = addr.get("address")?.takeIf { !it.isJsonNull }?.asString?.trim() ?: ""
            val buildingVal = addr.get("building")?.takeIf { !it.isJsonNull }?.asString?.trim() ?: ""
            val landmarkVal = addr.get("landmark")?.takeIf { !it.isJsonNull }?.asString?.trim() ?: ""
            val cityVal = addr.get("city")?.takeIf { !it.isJsonNull }?.asString?.trim() ?: ""

            val parts = listOf(
                listOf(addressVal, buildingVal).filter { it.isNotEmpty() }.joinToString(" "),
                landmarkVal,
                cityVal
            ).filter { it.isNotEmpty() }
            if (parts.isNotEmpty()) parts.joinToString("\n") else null
        } catch (e: Exception) {
            null
        }
    }

    private fun parseTipAmount(rawNotes: String?): Double {
        if (rawNotes.isNullOrEmpty()) return 0.0
        return try {
            var obj = JsonParser.parseString(rawNotes).asJsonObject
            if (obj.has("payload") && obj.get("payload").isJsonObject) {
                obj = obj.getAsJsonObject("payload")
            }
            if (obj.has("cart") && obj.get("cart").isJsonObject) {
                val cart = obj.getAsJsonObject("cart")
                if (cart.has("tip_amount") && !cart.get("tip_amount").isJsonNull) {
                    cart.get("tip_amount").asDouble
                } else {
                    0.0
                }
            } else {
                if (obj.has("tip_amount") && !obj.get("tip_amount").isJsonNull) {
                    obj.get("tip_amount").asDouble
                } else {
                    0.0
                }
            }
        } catch (e: Exception) {
            0.0
        }
    }

    private fun parseScheduledDelivery(rawNotes: String?): String? {
        if (rawNotes.isNullOrEmpty()) return null
        return try {
            var obj = JsonParser.parseString(rawNotes).asJsonObject
            if (obj.has("payload") && obj.get("payload").isJsonObject) {
                obj = obj.getAsJsonObject("payload")
            }
            val isScheduled = obj.has("is_scheduled") && obj.get("is_scheduled").asBoolean
            if (!isScheduled) return null
            if (obj.has("delivery_timestamp_human") && obj.get("delivery_timestamp_human").isJsonObject) {
                val t = obj.getAsJsonObject("delivery_timestamp_human")
                val date = if (t.has("local_date") && !t.get("local_date").isJsonNull) t.get("local_date").asString else ""
                val time = if (t.has("local_time") && !t.get("local_time").isJsonNull) t.get("local_time").asString else ""
                "$date $time".trim().ifEmpty { null }
            } else null
        } catch (e: Exception) {
            null
        }
    }

    private class MerchantDetails(
        val city: String = "",
        val street: String = "",
        val phone: String = ""
    )

    private fun parseMerchantDetails(rawNotes: String?, fallbackId: String?): MerchantDetails {
        val isRajCurryFallback = fallbackId == "restaurant_1" || fallbackId == "6a0f03b4500ed5db150be1a1" || fallbackId == "restaurant_2"
        val defCity = if (isRajCurryFallback) "Enschede" else ""
        val defStreet = if (isRajCurryFallback) "Deurningerstraat 91B" else ""
        val defPhone = if (isRajCurryFallback) "053-3030011" else ""

        if (rawNotes.isNullOrEmpty()) {
            return MerchantDetails(defCity, defStreet, defPhone)
        }
        return try {
            var obj = JsonParser.parseString(rawNotes).asJsonObject
            if (obj.has("payload") && obj.get("payload").isJsonObject) {
                obj = obj.getAsJsonObject("payload")
            }
            
            // Try pickup_address first
            if (obj.has("pickup_address") && obj.get("pickup_address").isJsonObject) {
                val addr = obj.getAsJsonObject("pickup_address")
                val city = if (addr.has("city") && !addr.get("city").isJsonNull) addr.get("city").asString else ""
                val street = if (addr.has("address") && !addr.get("address").isJsonNull) addr.get("address").asString else ""
                val phone = if (addr.has("contact_phone_number") && !addr.get("contact_phone_number").isJsonNull) addr.get("contact_phone_number").asString else ""
                
                if (city.isNotEmpty() || street.isNotEmpty() || phone.isNotEmpty()) {
                    return MerchantDetails(
                        city = city.ifEmpty { defCity },
                        street = street.ifEmpty { defStreet },
                        phone = phone.ifEmpty { defPhone }
                    )
                }
            }
            
            // Try merchant next
            if (obj.has("merchant") && obj.get("merchant").isJsonObject) {
                val merchant = obj.getAsJsonObject("merchant")
                val city = if (merchant.has("city") && !merchant.get("city").isJsonNull) merchant.get("city").asString else ""
                val street = if (merchant.has("address") && !merchant.get("address").isJsonNull) merchant.get("address").asString else ""
                val phone = if (merchant.has("phone") && !merchant.get("phone").isJsonNull) merchant.get("phone").asString else ""
                
                if (city.isNotEmpty() || street.isNotEmpty() || phone.isNotEmpty()) {
                    return MerchantDetails(
                        city = city.ifEmpty { defCity },
                        street = street.ifEmpty { defStreet },
                        phone = phone.ifEmpty { defPhone }
                    )
                }
            }
            
            MerchantDetails(defCity, defStreet, defPhone)
        } catch (e: Exception) {
            MerchantDetails(defCity, defStreet, defPhone)
        }
    }

    fun printReceipt(
        order: Order,
        merchantName: String = "Spoonfull POS",
        isCustomerCopy: Boolean = false,
        onComplete: (Boolean) -> Unit = {}
    ) {
        val service = woyouService
        if (service == null) {
            Log.w(TAG, "Printer service is not bound yet. Attempting auto-bind and retry...")
            ensurePrinterBound { boundService ->
                if (boundService != null) {
                    printReceipt(order, merchantName, isCustomerCopy, onComplete)
                } else {
                    Log.e(TAG, "Failed to bind printer service for printReceipt.")
                    onComplete(false)
                }
            }
            return
        }

        try {
            val prefs = context.getSharedPreferences("spoonful_prefs", Context.MODE_PRIVATE)
            val showCustAddress = prefs.getBoolean("receipt_show_address", true)
            val showCustPhone = prefs.getBoolean("receipt_show_phone", true)
            val showItemNotes = prefs.getBoolean("receipt_show_item_notes", true)
            val enlargeOrderNo = prefs.getBoolean("receipt_enlarge_order_no", true)
            val enlargeAddress = prefs.getBoolean("receipt_enlarge_address", false)
            val enlargePhone = prefs.getBoolean("receipt_enlarge_phone", false)

            // Paper-width dependent layout & font sizing
            val paperMm = getPaperWidthMm()
            val is80mm = paperMm >= 80
            val lineChars = lineCharsFor(paperMm)
            val divider = "-".repeat(lineChars) + "\n"
            val doubleDivider = "=".repeat(lineChars) + "\n"
            val nameWidth = lineChars - QTY_COLUMN_WIDTH - PRICE_COLUMNS_WIDTH // 18 on 58mm, 20 on 80mm
            val qrModuleSize = if (is80mm) 8 else 6

            // Dynamic Font Sizing: 80mm uses noticeably larger fonts for enhanced readability
            val titleFontSize = if (is80mm) 38f else 28f
            val headerDetailFontSize = if (is80mm) 30f else 24f
            val orderNoFontSize = if (is80mm) {
                if (enlargeOrderNo) 48f else 38f
            } else {
                if (enlargeOrderNo) 34f else 28f
            }
            val metaFontSize = if (is80mm) 30f else 24f
            val custFontSize = if (is80mm) {
                if (enlargeAddress || enlargePhone) 38f else 34f
            } else {
                if (enlargeAddress || enlargePhone) 30f else 28f
            }
            val bodyFontSize = if (is80mm) 32f else 24f
            val footerBannerFontSize = if (is80mm) 34f else 28f
            val footerDetailFontSize = if (is80mm) 30f else 24f

            Log.d(TAG, "Printing receipt on ${paperMm}mm paper ($lineChars chars/line, baseFont=${bodyFontSize}pt)")

            // 1. Initialize printer
            service.printerInit(printCallback)
            
            val isRajCurry = order.merchantId == "restaurant_1" || order.merchantId == "6a0f03b4500ed5db150be1a1" || order.merchantId == "restaurant_2"
            val mDetails = parseMerchantDetails(order.notes, order.merchantId)
            val merchantCity = mDetails.city
            val merchantStreet = mDetails.street
            val merchantPhone = mDetails.phone

            // --- Center Aligned Top Section ---
            service.setAlignment(1, printCallback)
            
            // Header Title (Store Copy vs Customer Copy)
            val headerLabel = if (isCustomerCopy) "Klantenbon" else "Winkelbon"
            service.setFontSize(titleFontSize, printCallback)
            sendText(service, "$headerLabel\n$merchantName\n")
            
            // Header Details
            service.setFontSize(headerDetailFontSize, printCallback)
            val headerBuilder = java.lang.StringBuilder()
            if (merchantCity.isNotEmpty()) headerBuilder.append(merchantCity).append("\n")
            if (merchantStreet.isNotEmpty()) headerBuilder.append(merchantStreet).append("\n")
            if (merchantPhone.isNotEmpty()) headerBuilder.append(merchantPhone).append("\n")
            headerBuilder.append(divider)
            sendText(service, headerBuilder.toString())

            // Sequential Order Identifier (Configurable Font Size)
            val seqNo = order.orderNumber.substringAfterLast("-").substringAfterLast("_")
            service.setFontSize(orderNoFontSize, printCallback)
            sendText(service, "$seqNo\n")

            // Metadata & Order Type
            service.setFontSize(metaFontSize, printCallback)
            val metaBuilder = java.lang.StringBuilder()
            metaBuilder.append(formatDate(order.createdAt)).append("\n")
            val scheduledTime = parseScheduledDelivery(order.notes)
            if (scheduledTime != null) {
                metaBuilder.append("Pre order tijd:\n")
                metaBuilder.append(scheduledTime).append("\n")
            }
            
            val typeStr = when ((order.type ?: "delivery").lowercase(Locale.getDefault())) {
                "pickup" -> "Afhalen"
                "delivery" -> "Bezorgen"
                else -> "Dine In"
            }
            metaBuilder.append(typeStr).append("\n")
            metaBuilder.append(divider)
            sendText(service, metaBuilder.toString())

            // Customer Details Block (Configurable display & font size)
            service.setAlignment(0, printCallback)
            val customerBuilder = java.lang.StringBuilder()
            
            val orderCount = order.customerOrderCount ?: 1
            if (orderCount > 1) {
                customerBuilder.append("REPEATING CUSTOMER\n(${orderCount}e bestelling)\n\n")
            } else {
                customerBuilder.append("NEW CUSTOMER\n\n")
            }

            if (!order.customerName.isNullOrEmpty()) {
                customerBuilder.append(order.customerName).append("\n")
            }
            if (showCustAddress) {
                if (!order.customerAddress.isNullOrEmpty()) {
                    customerBuilder.append(order.customerAddress).append("\n")
                    // If landmark was omitted from customerAddress, append it here
                    val landmark = parseDeliveryLandmark(order.notes)
                    if (!landmark.isNullOrEmpty()) {
                        val cleanAddr = order.customerAddress.replace("\\s".toRegex(), "").lowercase(Locale.getDefault())
                        val cleanLandmark = landmark.replace("\\s".toRegex(), "").lowercase(Locale.getDefault())
                        if (!cleanAddr.contains(cleanLandmark)) {
                            customerBuilder.append(landmark).append("\n")
                        }
                    }
                } else {
                    // Fallback to delivery_address in notes if customerAddress was blank
                    val fallbackAddr = parseDeliveryAddressFallback(order.notes)
                    if (!fallbackAddr.isNullOrEmpty()) {
                        customerBuilder.append(fallbackAddr).append("\n")
                    }
                }
            }
            if (showCustPhone && !order.customerPhone.isNullOrEmpty()) {
                customerBuilder.append(order.customerPhone).append("\n")
            }
            customerBuilder.append(divider)
            
            service.setFontSize(custFontSize, printCallback)
            sendText(service, customerBuilder.toString())
            service.setFontSize(bodyFontSize, printCallback) // reset to body size

            // --- Left Aligned Body Section ---
            service.setAlignment(0, printCallback)
            service.setFontSize(bodyFontSize, printCallback)
            val bodyBuilder = java.lang.StringBuilder()
            
            // Customer comment / notes (parsed correctly from JSON webhook payload)
            var parsedNotes = parseCustomerNotes(order.notes)
            if (parsedNotes.isNotEmpty() && !order.customerAddress.isNullOrEmpty()) {
                val cleanAddress = order.customerAddress.replace("\\s".toRegex(), "").lowercase(Locale.getDefault())
                parsedNotes = parsedNotes.split("\n")
                    .filter { line ->
                        val cleanLine = line.replace("\\s".toRegex(), "").lowercase(Locale.getDefault())
                        cleanLine.isNotEmpty() && cleanLine != cleanAddress && !cleanAddress.contains(cleanLine) && !cleanLine.contains(cleanAddress)
                    }
                    .joinToString("\n")
            }
            if (parsedNotes.isNotEmpty()) {
                bodyBuilder.append(divider)
                bodyBuilder.append("Opmerking:\n").append(parsedNotes).append("\n")
            }
            
            bodyBuilder.append(divider)
            
            val courierText = if ((order.type ?: "delivery").lowercase(Locale.getDefault()) == "delivery") {
                val driver = if (!order.driverName.isNullOrEmpty()) order.driverName else "Spoonfull"
                "Courier: $driver ${order.orderNumber ?: ""}"
            } else {
                "Order: ${order.orderNumber ?: ""}"
            }
            bodyBuilder.append(courierText).append("\n")
            bodyBuilder.append(divider)

            // Items Table
            bodyBuilder.append("Artikel".padEnd(QTY_COLUMN_WIDTH + nameWidth)).append("Stuk  Totaal\n")
            for (item in (order.items ?: emptyList())) {
                val qtyStr = "${item.quantity} " // 2 chars wide: "1 " or "10"
                val unitPriceStr = String.format(Locale.US, "%.2f", item.price).replace(".", ",")
                val totalPriceStr = String.format(Locale.US, "%.2f", item.price * item.quantity).replace(".", ",")
                
                // Format unit price and total price to be right-aligned in their 6-char columns
                val formattedUnit = unitPriceStr.padStart(6)
                val formattedTotal = totalPriceStr.padStart(6)
                
                // Max length for item name on the first line is nameWidth characters
                val name = item.name ?: ""
                if (name.length <= nameWidth) {
                    val spaces = " ".repeat(nameWidth - name.length)
                    bodyBuilder.append(qtyStr).append(name).append(spaces).append(formattedUnit).append(formattedTotal).append("\n")
                } else {
                    // Wrap the name
                    val chunks = mutableListOf<String>()
                    var current = name
                    while (current.length > nameWidth) {
                        var wrapIndex = current.lastIndexOf(' ', nameWidth)
                        if (wrapIndex == -1 || wrapIndex < nameWidth / 2) {
                            wrapIndex = nameWidth
                        }
                        chunks.add(current.substring(0, wrapIndex).trimEnd())
                        current = current.substring(wrapIndex).trimStart()
                    }
                    if (current.isNotEmpty()) {
                        chunks.add(current)
                    }
                    
                    // First line has the quantity, first chunk of name, unit price, and total price
                    val firstChunk = chunks[0]
                    val spaces = " ".repeat(nameWidth - firstChunk.length)
                    bodyBuilder.append(qtyStr).append(firstChunk).append(spaces).append(formattedUnit).append(formattedTotal).append("\n")
                    
                    // Subsequent lines only have the wrapped name chunks, indented by 2 spaces
                    for (i in 1 until chunks.size) {
                        bodyBuilder.append("  ").append(chunks[i]).append("\n")
                    }
                }
                
                if (showItemNotes && !item.notes.isNullOrEmpty()) {
                    bodyBuilder.append("  * Note: ").append(item.notes).append("\n")
                }
            }
            
            bodyBuilder.append(divider)

            // Calculations
            val totalValStr = String.format(Locale.US, "%.2f", order.total).replace(".", ",") + "€"
            val totalLine = formatLine("Totaal", totalValStr, lineChars)

            bodyBuilder.append(totalLine).append("\n")
            bodyBuilder.append(divider)
            
            val tipAmount = parseTipAmount(order.notes)
            if (tipAmount > 0.0) {
                val tipValStr = String.format(Locale.US, "%.2f", tipAmount).replace(".", ",") + "€"
                val tipLine = formatLine("Tip/Fooi:", tipValStr, lineChars)
                bodyBuilder.append(tipLine).append("\n")
                
                val finalTotalValStr = String.format(Locale.US, "%.2f", order.total + tipAmount).replace(".", ",") + "€"
                val finalTotalLine = formatLine("Totaal", finalTotalValStr, lineChars)
                bodyBuilder.append(finalTotalLine).append("\n")
                bodyBuilder.append(divider)
            }

            // Payment Info
            val pmRaw = (order.paymentMethod ?: "").lowercase(Locale.getDefault()).trim()
            val isOffline = listOf("cash", "cod", "cash_on_delivery", "pay_at_store", "pay_on_delivery", "pin", "pin_at_door").contains(pmRaw)
            val paymentSource = if (!isOffline) {
                if (pmRaw.isNotEmpty() && pmRaw != "online") {
                    "Online (${pmRaw.uppercase(Locale.getDefault())})"
                } else {
                    "Online"
                }
            } else {
                "Cash"
            }
            bodyBuilder.append("Betaling Spoonfull ").append(paymentSource).append("\n")
            
            // Flush Body block to printer in one AIDL IPC call
            sendText(service, bodyBuilder.toString())

            // --- Center Aligned Footer Section ---
            service.setAlignment(1, printCallback)
            val footerBuilder = java.lang.StringBuilder()
            footerBuilder.append(doubleDivider)
            footerBuilder.append(merchantName).append(" Online\n")
            footerBuilder.append(doubleDivider)
            sendText(service, footerBuilder.toString())

            service.setFontSize(footerBannerFontSize, printCallback)
            sendText(service, "GEEN COMMISSIE\nGEEN BEZORGKOSTEN!\n")
            service.setFontSize(footerDetailFontSize, printCallback)
            
            val isDelivery = (order.type ?: "delivery").lowercase(Locale.getDefault()) == "delivery"
            if (isDelivery && !isCustomerCopy) {
                // Store Copy for Delivery order -> Driver Claim QR Code
                sendText(service, "Bezorging Claim QR Code\n")

                val driverParam = if (!order.driverName.isNullOrEmpty()) "&driver=" + java.net.URLEncoder.encode(order.driverName, "UTF-8") else ""
                val driverUrl = "https://positivus-two-iota.vercel.app/driver?order_id=${order.id}$driverParam"
                service.printQRCode(driverUrl, qrModuleSize, 1, printCallback)
            } else {
                // Customer Copy OR Pickup Order -> Webshop QR Code (NO Driver Claim QR!)
                sendText(service, "Bestel via onze eigen webshop\n")

                val shopUrl = if (isRajCurry) "https://rajcurryhouse.nl" else "https://spoonful.nl"
                service.printQRCode(shopUrl, qrModuleSize, 1, printCallback)
            }
            
            // Feed paper
            service.lineWrap(8, printCallback)
            onComplete(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error printing receipt", e)
            onComplete(false)
        }
    }

    fun printTestPage() {
        val service = woyouService ?: return
        try {
            val paperMm = getPaperWidthMm()
            val is80mm = paperMm >= 80
            val lineChars = lineCharsFor(paperMm)
            val baseFontSize = if (is80mm) 32f else 24f
            val titleFontSize = if (is80mm) 38f else 32f
            val divider = "-".repeat(lineChars) + "\n"

            service.printerInit(printCallback)
            service.setAlignment(1, printCallback)
            service.setFontSize(titleFontSize, printCallback)
            sendText(service, "Spoonfull POS\n")
            service.setFontSize(baseFontSize, printCallback)
            sendText(service, "Sunmi Print Test\n")
            sendText(service, divider)
            service.setAlignment(0, printCallback)
            sendText(service, "Device: ${Build.MODEL}\n")
            sendText(service, "Printer: ${try { service.printerModal } catch (e: Exception) { "?" }}\n")
            sendText(service, "Paper: ${paperMm}mm ($lineChars chars @ ${baseFontSize.toInt()}pt)\n")
            sendText(service, "Printer Serial:\n${service.printerSerialNo}\n")
            sendText(service, "Printer Version:\n${service.printerVersion}\n")
            sendText(service, divider)
            // Width ruler: should fill exactly one line, edge to edge, without wrapping
            val ruler = StringBuilder()
            for (i in 1..lineChars) ruler.append((i % 10).toString())
            sendText(service, "$ruler\n")
            sendText(service, formatLine("Totaal", "12,34€", lineChars) + "\n")
            sendText(service, divider)
            service.lineWrap(4, printCallback)
        } catch (e: Exception) {
            Log.e(TAG, "Error printing test page", e)
        }
    }

    /**
     * Formats left and right text strings to opposite sides of a single receipt line.
     * Pad spaces in between.
     */
    private fun formatLine(left: String, right: String, maxLength: Int): String {
        val leftLen = left.length
        val rightLen = right.length
        val spacesNeeded = maxLength - leftLen - rightLen
        
        return if (spacesNeeded <= 0) {
            // If they are too long combined, just truncate or concatenate
            val availableSpace = maxLength - rightLen - 1
            if (availableSpace > 0) {
                left.substring(0, availableSpace) + " " + right
            } else {
                "$left $right"
            }
        } else {
            val builder = StringBuilder(left)
            for (i in 0 until spacesNeeded) {
                builder.append(" ")
            }
            builder.append(right)
            builder.toString()
        }
    }

    private fun formatDate(dateStr: String): String {
        return try {
            // Parse standard ISO/Supabase date "2026-11-15T10:07:32.123456+00:00" or "2026-11-15T10:07:32Z"
            val cleaned = dateStr.substringBefore(".").substringBefore("+").substringBefore("Z")
            val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }
            val date = inputFormat.parse(cleaned)
            val outputFormat = SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("Europe/Amsterdam")
            }
            date?.let { outputFormat.format(it) } ?: dateStr
        } catch (e: Exception) {
            dateStr
        }
    }

    fun getWoyouServiceInstance(): IWoyouService? {
        return woyouService
    }
}
