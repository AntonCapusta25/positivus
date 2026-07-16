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

    fun printReceipt(order: Order, onComplete: (Boolean) -> Unit = {}) {
        val service = woyouService
        if (service == null) {
            Log.e(TAG, "Printer service is not bound.")
            onComplete(false)
            return
        }

        try {
            // 1. Initialize printer
            service.printerInit(printCallback)
            service.setFontSize(24f, printCallback) // Standard font size

            // 2. Header (Matching Raj Curry House reference)
            service.setAlignment(1, printCallback) // Center
            service.printText("Klantenbon\n", printCallback)
            
            val isRajCurry = order.merchantId == "restaurant_1" || order.merchantId == "restaurant_2"
            val merchantName = if (isRajCurry) "Raj Curry House" else "Spoonful POS"
            val merchantCity = if (isRajCurry) "Enschede" else ""
            val merchantStreet = if (isRajCurry) "Deurningerstraat91B" else ""
            val merchantPhone = if (isRajCurry) "053-3030011" else ""

            service.setFontSize(28f, printCallback)
            service.printText("$merchantName\n", printCallback)
            service.setFontSize(24f, printCallback)
            
            if (merchantCity.isNotEmpty()) service.printText("$merchantCity\n", printCallback)
            if (merchantStreet.isNotEmpty()) service.printText("$merchantStreet\n", printCallback)
            if (merchantPhone.isNotEmpty()) service.printText("$merchantPhone\n", printCallback)
            
            service.printText("--------------------------------\n", printCallback)

            // 3. Sequential / Short Order Identifier & Timestamps
            val seqNo = order.orderNumber.substringAfterLast("-").substringAfterLast("_")
            service.setFontSize(28f, printCallback) // Keep within safe limit of 28f
            service.printText("$seqNo\n", printCallback)
            service.setFontSize(24f, printCallback) // Reset
            
            service.printText("${formatDate(order.createdAt)}\n", printCallback)
            service.printText("Pre order tijd:\n", printCallback)
            service.printText("${formatDate(order.createdAt)}\n", printCallback)
            
            val typeStr = when (order.type.lowercase(Locale.getDefault())) {
                "pickup" -> "Afhalen"
                "delivery" -> "Bezorgen"
                else -> "Dine In"
            }
            service.setFontSize(28f, printCallback)
            service.printText("$typeStr\n", printCallback)
            service.setFontSize(24f, printCallback)
            
            service.printText("--------------------------------\n", printCallback)

            // 4. Customer Address (Replicating exact layout in image)
            service.setAlignment(0, printCallback) // Left aligned for customer details
            if (!order.customerName.isNullOrEmpty()) {
                val nameParts = order.customerName.split(" ")
                for (part in nameParts) {
                    service.printText("$part\n", printCallback)
                }
            }
            if (!order.customerAddress.isNullOrEmpty()) {
                service.printText("${order.customerAddress}\n", printCallback)
            }
            if (!order.customerPhone.isNullOrEmpty()) {
                service.printText("${order.customerPhone}\n", printCallback)
            }
            
            service.printText("--------------------------------\n", printCallback)
            
            // Notes / Courier details
            val courierText = if (order.type.lowercase(Locale.getDefault()) == "delivery") {
                "Courier: takeaway Thuisbezorgd.nl ${order.orderNumber.substringAfterLast("-")}"
            } else {
                "Order: ${order.orderNumber}"
            }
            service.printText("$courierText\n", printCallback)
            service.printText("--------------------------------\n", printCallback)

            // 5. Items Table
            service.printText("Artikel                 Stuk  Totaal\n", printCallback)
            for (item in order.items) {
                val itemText = "${item.quantity}  ${item.name}"
                val priceVal = item.price * item.quantity
                val priceStr = String.format(Locale.US, "%.2f", priceVal).replace(".", ",")
                val formattedLine = formatLine(itemText, priceStr, MAX_LINE_CHAR_58MM)
                service.printText("$formattedLine\n", printCallback)
                
                if (!item.notes.isNullOrEmpty()) {
                    service.printText("  * Note: ${item.notes}\n", printCallback)
                }
            }
            
            service.printText("--------------------------------\n", printCallback)

            // 6. Calculations
            val totalValStr = String.format(Locale.US, "%.2f", order.total).replace(".", ",")
            val taxValStr = String.format(Locale.US, "%.2f", order.tax).replace(".", ",")
            val nettoValStr = String.format(Locale.US, "%.2f", order.total - order.tax).replace(".", ",")

            val totalLine1 = formatLine("Totaal", totalValStr, MAX_LINE_CHAR_58MM)
            val nettoLine = formatLine("Netto:", nettoValStr, MAX_LINE_CHAR_58MM)
            val taxLine = formatLine("BTW.:", taxValStr, MAX_LINE_CHAR_58MM)
            val totalLine2 = formatLine("Totaal", totalValStr, MAX_LINE_CHAR_58MM)

            service.printText("$totalLine1\n", printCallback)
            service.printText("--------------------------------\n", printCallback)
            service.printText("$nettoLine\n", printCallback)
            service.printText("$taxLine\n", printCallback)
            
            // Bold Total Line
            service.setFontSize(28f, printCallback)
            service.printText("$totalLine2\n", printCallback)
            service.setFontSize(24f, printCallback)

            // 7. Payment Info
            val paymentSource = if (order.paymentMethod.lowercase(Locale.getDefault()) == "online") "Online" else "Cash"
            service.printText("Betaling $merchantName $paymentSource (Thuisbezorgd.nl)\n", printCallback)
            
            // 8. Footer & QR code
            service.printText("================================\n", printCallback)
            service.printText("$merchantName Online\n", printCallback)
            service.printText("================================\n", printCallback)
            
            if (order.type.lowercase(Locale.getDefault()) == "delivery") {
                service.printText("Bezorging Claim QR Code\n", printCallback)
                val driverUrl = "https://positivus-two-iota.vercel.app/driver?order_id=${order.id}"
                service.printQRCode(driverUrl, 6, 1, printCallback)
            } else {
                service.printText("Bestel via onze eigen webshop\n", printCallback)
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
            service.printText("Spoonful POS\n", printCallback)
            service.setFontSize(24f, printCallback)
            service.printText("Sunmi V2 Pro Print Test\n", printCallback)
            service.printText("--------------------------------\n", printCallback)
            service.setAlignment(0, printCallback)
            service.printText("Printer Serial:\n${service.printerSerialNo}\n", printCallback)
            service.printText("Printer Version:\n${service.printerVersion}\n", printCallback)
            service.printText("Printer Status: ${service.getPrinterStatus()}\n", printCallback)
            service.printText("--------------------------------\n", printCallback)
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
}
