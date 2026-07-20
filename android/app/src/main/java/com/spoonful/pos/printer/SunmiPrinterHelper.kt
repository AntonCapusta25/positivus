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
            .replace("€", "EUR")
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

            // Header - Center Aligned, Large Font (28f)
            service.setAlignment(1, printCallback)
            service.setFontSize(28f, printCallback)
            val headerText = "Klantenbon\n$merchantName\n"
            sendText(service, headerText)

            // Reset formatting for Body
            service.setAlignment(0, printCallback) // Left-aligned
            service.setFontSize(24f, printCallback) // Standard font size

            val bodyBuilder = java.lang.StringBuilder()
            if (merchantCity.isNotEmpty()) bodyBuilder.append(merchantCity).append("\n")
            if (merchantStreet.isNotEmpty()) bodyBuilder.append(merchantStreet).append("\n")
            if (merchantPhone.isNotEmpty()) bodyBuilder.append(merchantPhone).append("\n")
            
            bodyBuilder.append("--------------------------------\n")

            // 2. Sequential / Short Order Identifier & Timestamps
            val seqNo = order.orderNumber.substringAfterLast("-").substringAfterLast("_")
            bodyBuilder.append("Order: ").append(seqNo).append("\n")
            bodyBuilder.append(formatDate(order.createdAt)).append("\n")
            bodyBuilder.append("Pre order tijd:\n")
            bodyBuilder.append(formatDate(order.createdAt)).append("\n")
            
            val typeStr = when (order.type.lowercase(Locale.getDefault())) {
                "pickup" -> "Afhalen"
                "delivery" -> "Bezorgen"
                else -> "Dine In"
            }
            bodyBuilder.append(typeStr).append("\n")
            bodyBuilder.append("--------------------------------\n")

            // 3. Customer Address
            if (!order.customerName.isNullOrEmpty()) {
                val nameParts = order.customerName.split(" ")
                for (part in nameParts) {
                    bodyBuilder.append(part).append("\n")
                }
            }
            if (!order.customerAddress.isNullOrEmpty()) {
                bodyBuilder.append(order.customerAddress).append("\n")
            }
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
                if (!order.driverName.isNullOrEmpty()) {
                    "Courier: ${order.driverName}"
                } else {
                    "Courier: Unassigned (Claim via QR)"
                }
            } else {
                "Order: ${order.orderNumber}"
            }
            bodyBuilder.append(courierText).append("\n")
            bodyBuilder.append("--------------------------------\n")

            // 4. Items Table
            bodyBuilder.append("Artikel                 Stuk  Totaal\n")
            for (item in order.items) {
                val qtyStr = "${item.quantity}x "
                val nameStr = item.name
                val priceVal = item.price * item.quantity
                val priceStr = String.format(Locale.US, "%.2f", priceVal).replace(".", ",")
                
                val rightWidth = priceStr.length
                val leftWidth = MAX_LINE_CHAR_58MM - rightWidth - 1 // 32 - length - 1
                
                val itemPrefix = qtyStr + nameStr
                if (itemPrefix.length <= leftWidth) {
                    val spaces = " ".repeat(MAX_LINE_CHAR_58MM - itemPrefix.length - rightWidth)
                    bodyBuilder.append(itemPrefix).append(spaces).append(priceStr).append("\n")
                } else {
                    val chunks = mutableListOf<String>()
                    var current = itemPrefix
                    while (current.length > leftWidth) {
                        var wrapIndex = current.lastIndexOf(' ', leftWidth)
                        if (wrapIndex == -1 || wrapIndex < leftWidth / 2) {
                            wrapIndex = leftWidth
                        }
                        chunks.add(current.substring(0, wrapIndex).trimEnd())
                        current = current.substring(wrapIndex).trimStart()
                    }
                    if (current.isNotEmpty()) {
                        chunks.add(current)
                    }
                    
                    val firstLineText = chunks[0]
                    val spaces = " ".repeat(MAX_LINE_CHAR_58MM - firstLineText.length - rightWidth)
                    bodyBuilder.append(firstLineText).append(spaces).append(priceStr).append("\n")
                    
                    val padSpaces = " ".repeat(qtyStr.length)
                    for (i in 1 until chunks.size) {
                        bodyBuilder.append(padSpaces).append(chunks[i]).append("\n")
                    }
                }
                
                if (!item.notes.isNullOrEmpty()) {
                    bodyBuilder.append("  * Note: ").append(item.notes).append("\n")
                }
            }
            
            bodyBuilder.append("--------------------------------\n")

            // 5. Calculations
            val totalValStr = String.format(Locale.US, "%.2f", order.total).replace(".", ",")
            val taxValStr = String.format(Locale.US, "%.2f", order.tax).replace(".", ",")
            val nettoValStr = String.format(Locale.US, "%.2f", order.total - order.tax).replace(".", ",")

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

            // 6. Payment Info
            val paymentSource = if (order.paymentMethod.lowercase(Locale.getDefault()) == "online") "Online" else "Cash"
            bodyBuilder.append("Betaling ").append(merchantName).append(" ").append(paymentSource).append(" (Thuisbezorgd.nl)\n")
            
            bodyBuilder.append("================================\n")
            bodyBuilder.append(merchantName).append(" Online\n")
            bodyBuilder.append("================================\n")
            
            if (order.type.lowercase(Locale.getDefault()) == "delivery") {
                bodyBuilder.append("Bezorging Claim QR Code\n")
            } else {
                bodyBuilder.append("Bestel via onze eigen webshop\n")
            }

            // Flush Body block to printer in one AIDL IPC call
            sendText(service, bodyBuilder.toString())

            // 7. QR code & spacing
            service.setAlignment(1, printCallback)
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
