package com.spoonful.pos.printer

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
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
        private const val MAX_LINE_CHAR_58MM = 32
    }

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
            val obj = JsonParser.parseString(rawNotes).asJsonObject
            obj.get("order_comment")?.asString
                ?: obj.get("delivery_instructions")?.asString
                ?: obj.get("notes")?.asString
                ?: obj.get("order_instruction")?.asString
                ?: ""
        } catch (e: Exception) {
            if (rawNotes.trim().startsWith("{")) "" else rawNotes
        }
    }

    fun printReceipt(order: Order, merchantName: String = "Spoonful POS", onComplete: (Boolean) -> Unit = {}) {
        val service = woyouService
        if (service == null) {
            Log.e(TAG, "Printer service is not bound.")
            onComplete(false)
            return
        }

        try {
            // 1. Initialize printer
            service.printerInit(printCallback)
            
            val isRajCurry = order.merchantId == "restaurant_1" || order.merchantId == "6a0f03b4500ed5db150be1a1" || order.merchantId == "restaurant_2"
            val merchantCity = if (isRajCurry) "Enschede" else ""
            val merchantStreet = if (isRajCurry) "Deurningerstraat91B" else ""
            val merchantPhone = if (isRajCurry) "053-3030011" else ""

            // --- Center Aligned Top Section ---
            service.setAlignment(1, printCallback)
            
            // Header Title
            service.setFontSize(28f, printCallback)
            sendText(service, "Klantenbon\n$merchantName\n")
            
            // Header Details
            service.setFontSize(24f, printCallback)
            val headerBuilder = java.lang.StringBuilder()
            if (merchantCity.isNotEmpty()) headerBuilder.append(merchantCity).append("\n")
            if (merchantStreet.isNotEmpty()) headerBuilder.append(merchantStreet).append("\n")
            if (merchantPhone.isNotEmpty()) headerBuilder.append(merchantPhone).append("\n")
            headerBuilder.append("--------------------------------\n")
            sendText(service, headerBuilder.toString())

            // Sequential Order Identifier (Large Text)
            val seqNo = order.orderNumber.substringAfterLast("-").substringAfterLast("_")
            service.setFontSize(32f, printCallback)
            sendText(service, "$seqNo\n")

            // Metadata & Order Type
            service.setFontSize(24f, printCallback)
            val metaBuilder = java.lang.StringBuilder()
            metaBuilder.append(formatDate(order.createdAt)).append("\n")
            metaBuilder.append("Pre order tijd:\n")
            metaBuilder.append(formatDate(order.createdAt)).append("\n")
            
            val typeStr = when (order.type.lowercase(Locale.getDefault())) {
                "pickup" -> "Afhalen"
                "delivery" -> "Bezorgen"
                else -> "Dine In"
            }
            metaBuilder.append(typeStr).append("\n")
            metaBuilder.append("--------------------------------\n")
            sendText(service, metaBuilder.toString())

            // --- Left Aligned Body Section ---
            service.setAlignment(0, printCallback)
            val bodyBuilder = java.lang.StringBuilder()

            // Customer Name
            if (!order.customerName.isNullOrEmpty()) {
                val nameParts = order.customerName.split(" ")
                for (part in nameParts) {
                    bodyBuilder.append(part).append("\n")
                }
            }
            // Customer Address
            if (!order.customerAddress.isNullOrEmpty()) {
                bodyBuilder.append(order.customerAddress).append("\n")
            }
            // Customer Phone
            if (!order.customerPhone.isNullOrEmpty()) {
                bodyBuilder.append(order.customerPhone).append("\n")
            }
            
            // Customer comment / notes (parsed correctly from JSON webhook payload)
            val parsedNotes = parseCustomerNotes(order.notes)
            if (parsedNotes.isNotEmpty()) {
                bodyBuilder.append("--------------------------------\n")
                bodyBuilder.append("Opmerking:\n").append(parsedNotes).append("\n")
            }
            
            bodyBuilder.append("--------------------------------\n")
            
            val courierText = if (order.type.lowercase(Locale.getDefault()) == "delivery") {
                val driver = if (!order.driverName.isNullOrEmpty()) order.driverName else "Spoonful"
                "Courier: $driver ${order.orderNumber}"
            } else {
                "Order: ${order.orderNumber}"
            }
            bodyBuilder.append(courierText).append("\n")
            bodyBuilder.append("--------------------------------\n")

            // Items Table
            bodyBuilder.append("Artikel             Stuk  Totaal\n")
            for (item in order.items) {
                val qtyStr = "${item.quantity} " // 2 chars wide: "1 " or "10"
                val unitPriceStr = String.format(Locale.US, "%.2f", item.price).replace(".", ",")
                val totalPriceStr = String.format(Locale.US, "%.2f", item.price * item.quantity).replace(".", ",")
                
                // Format unit price and total price to be right-aligned in their 6-char columns
                val formattedUnit = unitPriceStr.padStart(6)
                val formattedTotal = totalPriceStr.padStart(6)
                
                // Max length for item name on the first line is 18 characters
                val name = item.name
                if (name.length <= 18) {
                    val spaces = " ".repeat(18 - name.length)
                    bodyBuilder.append(qtyStr).append(name).append(spaces).append(formattedUnit).append(formattedTotal).append("\n")
                } else {
                    // Wrap the name
                    val chunks = mutableListOf<String>()
                    var current = name
                    while (current.length > 18) {
                        var wrapIndex = current.lastIndexOf(' ', 18)
                        if (wrapIndex == -1 || wrapIndex < 9) {
                            wrapIndex = 18
                        }
                        chunks.add(current.substring(0, wrapIndex).trimEnd())
                        current = current.substring(wrapIndex).trimStart()
                    }
                    if (current.isNotEmpty()) {
                        chunks.add(current)
                    }
                    
                    // First line has the quantity, first chunk of name, unit price, and total price
                    val firstChunk = chunks[0]
                    val spaces = " ".repeat(18 - firstChunk.length)
                    bodyBuilder.append(qtyStr).append(firstChunk).append(spaces).append(formattedUnit).append(formattedTotal).append("\n")
                    
                    // Subsequent lines only have the wrapped name chunks, indented by 2 spaces
                    for (i in 1 until chunks.size) {
                        bodyBuilder.append("  ").append(chunks[i]).append("\n")
                    }
                }
                
                if (!item.notes.isNullOrEmpty()) {
                    bodyBuilder.append("  * Note: ").append(item.notes).append("\n")
                }
            }
            
            bodyBuilder.append("--------------------------------\n")

            // Calculations
            val totalValStr = String.format(Locale.US, "%.2f", order.total).replace(".", ",") + "€"
            val taxValStr = String.format(Locale.US, "%.2f", order.tax).replace(".", ",") + "€"
            val nettoValStr = String.format(Locale.US, "%.2f", order.total - order.tax).replace(".", ",") + "€"

            val totalLine1 = formatLine("Totaal", totalValStr, MAX_LINE_CHAR_58MM)
            val nettoLine = formatLine("Netto:", nettoValStr, MAX_LINE_CHAR_58MM)
            val taxLine = formatLine("BTW.:", taxValStr, MAX_LINE_CHAR_58MM)
            val totalLine2 = formatLine("Totaal", totalValStr, MAX_LINE_CHAR_58MM)

            bodyBuilder.append(totalLine1).append("\n")
            bodyBuilder.append("--------------------------------\n")
            bodyBuilder.append(nettoLine).append("\n")
            bodyBuilder.append(taxLine).append("\n")
            bodyBuilder.append(totalLine2).append("\n")
            bodyBuilder.append("--------------------------------\n")

            // Payment Info
            val paymentSource = if (order.paymentMethod.lowercase(Locale.getDefault()) == "online") "Online" else "Cash"
            bodyBuilder.append("Betaling Spoonful ").append(paymentSource).append("\n")
            
            // Flush Body block to printer in one AIDL IPC call
            sendText(service, bodyBuilder.toString())

            // --- Center Aligned Footer Section ---
            service.setAlignment(1, printCallback)
            val footerBuilder = java.lang.StringBuilder()
            footerBuilder.append("================================\n")
            footerBuilder.append(merchantName).append(" Online\n")
            footerBuilder.append("================================\n")
            
            if (order.type.lowercase(Locale.getDefault()) == "delivery") {
                footerBuilder.append("Bezorging Claim QR Code\n")
            } else {
                footerBuilder.append("Bestel via onze eigen webshop\n")
            }
            sendText(service, footerBuilder.toString())

            // QR code & spacing
            if (order.type.lowercase(Locale.getDefault()) == "delivery") {
                val driverParam = if (!order.driverName.isNullOrEmpty()) "&driver=" + java.net.URLEncoder.encode(order.driverName, "UTF-8") else ""
                val driverUrl = "https://positivus-two-iota.vercel.app/driver?order_id=${order.id}$driverParam"
                service.printQRCode(driverUrl, 6, 1, printCallback)
            } else {
                val shopUrl = if (isRajCurry) "https://rajcurryhouse.nl" else "https://spoonful.nl"
                service.printQRCode(shopUrl, 6, 1, printCallback)
            }
            
            // Feed paper
            service.lineWrap(4, printCallback)
            onComplete(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error printing receipt", e)
            onComplete(false)
        }
    }

    fun printTestPage() {
        val service = woyouService ?: return
        try {
            service.printerInit(printCallback)
            service.setAlignment(1, printCallback)
            service.setFontSize(32f, printCallback)
            sendText(service, "Spoonful POS\n")
            service.setFontSize(24f, printCallback)
            sendText(service, "Sunmi V2 Pro Print Test\n")
            sendText(service, "--------------------------------\n")
            service.setAlignment(0, printCallback)
            sendText(service, "Printer Serial:\n${service.printerSerialNo}\n")
            sendText(service, "Printer Version:\n${service.printerVersion}\n")
            sendText(service, "Printer Status: ${service.getPrinterStatus()}\n")
            sendText(service, "--------------------------------\n")
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
            // Parse standard ISO/Supabase date "2026-06-12T10:07:32.123456+00:00"
            val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
            val date = inputFormat.parse(dateStr)
            val outputFormat = SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.US)
            date?.let { outputFormat.format(it) } ?: dateStr
        } catch (e: Exception) {
            dateStr
        }
    }

    fun getWoyouServiceInstance(): IWoyouService? {
        return woyouService
    }
}
