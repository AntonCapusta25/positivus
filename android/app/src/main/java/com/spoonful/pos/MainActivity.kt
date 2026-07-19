package com.spoonful.pos

import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.GravityCompat
import androidx.drawerlayout.widget.DrawerLayout
import com.spoonful.pos.model.Order
import com.spoonful.pos.model.OrderItem
import com.spoonful.pos.printer.SunmiPrinterHelper
import com.spoonful.pos.supabase.SupabaseConfig
import com.spoonful.pos.supabase.SupabaseManager
import com.google.gson.JsonParser
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    // --- Views ---
    private lateinit var drawerLayout: DrawerLayout
    private lateinit var btnHamburger: TextView
    private lateinit var btnDrawerClose: TextView
    private lateinit var btnDrawerRefresh: LinearLayout
    private lateinit var btnDrawerStopOrders: LinearLayout
    private lateinit var btnDrawerManagement: LinearLayout
    private lateinit var btnDrawerSettings: LinearLayout
    private lateinit var layoutDrawerManagementSub: LinearLayout
    private lateinit var layoutDrawerSettingsSub: LinearLayout
    private lateinit var txtDrawerManagementChevron: TextView
    private lateinit var txtDrawerSettingsChevron: TextView
    private lateinit var btnSubSounds: TextView
    private lateinit var btnSubReceipts: TextView
    private lateinit var btnSubTodaySales: TextView
    private lateinit var btnSubConnectivity: TextView
    private lateinit var btnSubLanguage: TextView
    private lateinit var btnSubDeviceInfo: TextView

    // Status indicators (in drawer footer)
    private lateinit var dotSupabase: View
    private lateinit var dotPrinter: View
    private lateinit var txtSupabaseStatus: TextView
    private lateinit var txtPrinterStatus: TextView

    // Screen containers
    private lateinit var layoutOrderList: LinearLayout
    private lateinit var layoutOrderDetail: LinearLayout
    private lateinit var layoutSettingsReceipts: LinearLayout
    private lateinit var layoutSettingsSounds: LinearLayout
    private lateinit var layoutSettingsMenu: LinearLayout

    // Order List Views
    private lateinit var btnTabPrepare: LinearLayout
    private lateinit var btnTabHandover: LinearLayout
    private lateinit var btnTabDone: LinearLayout
    private lateinit var txtTabPrepare: TextView
    private lateinit var txtTabHandover: TextView
    private lateinit var txtTabDone: TextView
    private lateinit var ordersContainer: LinearLayout
    private lateinit var txtNoOrders: TextView

    // Order Detail Views
    private lateinit var btnDetailBack: TextView
    private lateinit var btnDetailPrint: TextView
    private lateinit var txtDetailHeaderTitle: TextView
    private lateinit var txtDetailTimeVal: TextView
    private lateinit var txtDetailTimeLabel: TextView
    private lateinit var txtDetailAddress: TextView
    private lateinit var txtDetailOrderCode: TextView
    private lateinit var txtDetailType: TextView
    private lateinit var txtDetailCustomerName: TextView
    private lateinit var txtDetailPaidBadge: TextView
    private lateinit var txtCustomerChevron: TextView
    private lateinit var layoutCustomerDetails: LinearLayout
    private lateinit var txtDetailCustomerPhone: TextView
    private lateinit var txtDetailCustomerNotes: TextView
    private lateinit var txtDetailItemsCountHeader: TextView
    private lateinit var layoutDetailItemsContainer: LinearLayout
    private lateinit var txtDetailSubtotal: TextView
    private lateinit var txtDetailDeliveryFee: TextView
    private lateinit var txtDetailTotal: TextView
    private lateinit var btnDetailAction: android.widget.Button
    private lateinit var btnDetailAssignDriver: android.widget.Button
    private lateinit var btnToggleCustomerInfo: LinearLayout
    private lateinit var btnDrawerSwitchRestaurant: LinearLayout
    private lateinit var txtDrawerActiveRestaurant: TextView
    private lateinit var btnSubMenuManagement: TextView

    // Receipts settings views
    private lateinit var btnReceiptsBack: TextView
    private lateinit var btnReceiptsMinus: TextView
    private lateinit var btnReceiptsPlus: TextView
    private lateinit var txtReceiptsCount: TextView
    private lateinit var btnReceiptsPrintTest: android.widget.Button
    private lateinit var switchAutoPrint: com.google.android.material.switchmaterial.SwitchMaterial

    // Sounds settings views
    private lateinit var btnSoundsBack: TextView
    private lateinit var seekBarVolume: SeekBar
    private lateinit var txtSoundVolumeVal: TextView

    // Menu management views
    private lateinit var btnMenuBack: TextView
    private lateinit var menuItemsContainer: LinearLayout

    // Drawer Auto-Print views
    private lateinit var btnDrawerAutoPrintToggle: LinearLayout
    private lateinit var txtDrawerAutoPrintStatus: TextView
    private lateinit var switchDrawerAutoPrint: com.google.android.material.switchmaterial.SwitchMaterial

    // --- State ---
    private enum class Screen { ORDER_LIST, ORDER_DETAIL, SETTINGS_RECEIPTS, SETTINGS_SOUNDS, SETTINGS_MENU }
    private var currentScreen = Screen.ORDER_LIST
    private var currentTab = "prepare" // "prepare", "handover", "done"
    private var selectedOrder: Order? = null
    private var receiptCopiesCount = 1
    private var isStopOrdersActive = false
    private var isAutoPrintEnabled = true

    // --- Data & Services ---
    private val ordersList = mutableListOf<Order>()
    // Track IDs of orders already sent to printer to prevent duplicate prints on WS reconnect
    private val printedOrderIds = HashSet<String>()
    private lateinit var printerHelper: SunmiPrinterHelper
    private lateinit var supabaseManager: SupabaseManager
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var timerRunnable: Runnable
    private var merchantId = "6a0f03b4500ed5db150be1a1"

    // --- Helpers ---
    private fun dp(value: Int) = (value * resources.displayMetrics.density + 0.5f).toInt()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Load saved merchant ID
        val prefs = getSharedPreferences("spoonful_prefs", MODE_PRIVATE)
        merchantId = prefs.getString("merchant_id", "6a0f03b4500ed5db150be1a1") ?: "6a0f03b4500ed5db150be1a1"
        isAutoPrintEnabled = prefs.getBoolean("auto_print", true)

        printerHelper = SunmiPrinterHelper(this)
        supabaseManager = SupabaseManager(
            supabaseUrl = SupabaseConfig.SUPABASE_URL,
            supabaseKey = SupabaseConfig.SUPABASE_KEY,
            merchantId = merchantId,
            listener = object : SupabaseManager.SupabaseListener {
                override fun onOrderInserted(order: Order) {
                    runOnUiThread {
                        // Prevent duplicate list entries
                        if (ordersList.none { it.id == order.id }) {
                            ordersList.add(0, order)
                            refreshOrderList()
                        }

                        // Auto-print: only once per order ID, never on reconnect re-deliveries
                        if (isAutoPrintEnabled && !printedOrderIds.contains(order.id)) {
                            printedOrderIds.add(order.id)
                            order.printed = true
                            printerHelper.printReceipt(order, txtDrawerActiveRestaurant.text.toString()) { success ->
                                if (success) {
                                    runOnUiThread { refreshOrderList() }
                                }
                            }
                        }
                    }
                }
                override fun onOrdersLoaded(orders: List<Order>) {
                    runOnUiThread {
                        ordersList.clear()
                        ordersList.addAll(orders)
                        refreshOrderList()
                    }
                }
                override fun onConnectionStatusChanged(connected: Boolean) {
                    runOnUiThread { updateSupabaseStatus(connected) }
                }
                override fun onError(error: String) {
                    android.util.Log.e("MainActivity", "Supabase error: $error")
                }
            }
        )

        bindViews()
        txtDrawerActiveRestaurant.text = if (merchantId == "restaurant_1" || merchantId == "6a0f03b4500ed5db150be1a1") {
            "Raj Curry House"
        } else {
            "Spoonful POS"
        }

        // Sync auto-print UI
        switchDrawerAutoPrint.isChecked = isAutoPrintEnabled
        txtDrawerAutoPrintStatus.text = if (isAutoPrintEnabled) "Enabled" else "Disabled"
        txtDrawerAutoPrintStatus.setTextColor(Color.parseColor(if (isAutoPrintEnabled) "#00A389" else "#EF4444"))

        setupSwitchColorStates(switchAutoPrint)
        setupSwitchColorStates(switchDrawerAutoPrint)

        setupDrawer()
        setupMenuManagement()
        setupTabs()
        setupDetailScreen()
        setupReceiptsSettings()
        setupSoundsSettings()
        setupTimerTick()

        loadMockData()

        // Bind printer service
        printerHelper.bindPrinterService(object : SunmiPrinterHelper.PrinterBindListener {
            override fun onPrinterBound(bound: Boolean) {
                runOnUiThread { updatePrinterStatus(bound) }
            }
        })

        // Start Supabase realtime connection
        supabaseManager.start()
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(timerRunnable)
        printerHelper.unbindPrinterService()
        supabaseManager.stop()
    }

    override fun onBackPressed() {
        when {
            drawerLayout.isDrawerOpen(GravityCompat.START) -> drawerLayout.closeDrawer(GravityCompat.START)
            currentScreen == Screen.ORDER_DETAIL -> showScreen(Screen.ORDER_LIST)
            currentScreen == Screen.SETTINGS_RECEIPTS -> showScreen(Screen.ORDER_LIST)
            currentScreen == Screen.SETTINGS_SOUNDS -> showScreen(Screen.ORDER_LIST)
            else -> super.onBackPressed()
        }
    }

    // ─────────────────────────────────────────────
    // BIND VIEWS
    // ─────────────────────────────────────────────
    private fun bindViews() {
        drawerLayout = findViewById(R.id.drawerLayout)
        btnHamburger = findViewById(R.id.btnHamburger)
        btnDrawerClose = findViewById(R.id.btnDrawerClose)
        btnDrawerRefresh = findViewById(R.id.btnDrawerRefresh)
        btnDrawerStopOrders = findViewById(R.id.btnDrawerStopOrders)
        btnDrawerManagement = findViewById(R.id.btnDrawerManagement)
        btnDrawerSettings = findViewById(R.id.btnDrawerSettings)
        layoutDrawerManagementSub = findViewById(R.id.layoutDrawerManagementSub)
        layoutDrawerSettingsSub = findViewById(R.id.layoutDrawerSettingsSub)
        txtDrawerManagementChevron = findViewById(R.id.txtDrawerManagementChevron)
        txtDrawerSettingsChevron = findViewById(R.id.txtDrawerSettingsChevron)
        btnSubSounds = findViewById(R.id.btnSubSounds)
        btnSubReceipts = findViewById(R.id.btnSubReceipts)
        btnSubTodaySales = findViewById(R.id.btnSubTodaySales)
        btnSubConnectivity = findViewById(R.id.btnSubConnectivity)
        btnSubLanguage = findViewById(R.id.btnSubLanguage)
        btnSubDeviceInfo = findViewById(R.id.btnSubDeviceInfo)

        dotSupabase = findViewById(R.id.dotSupabase)
        dotPrinter = findViewById(R.id.dotPrinter)
        txtSupabaseStatus = findViewById(R.id.txtSupabaseStatus)
        txtPrinterStatus = findViewById(R.id.txtPrinterStatus)

        layoutOrderList = findViewById(R.id.layoutOrderList)
        layoutOrderDetail = findViewById(R.id.layoutOrderDetail)
        layoutSettingsReceipts = findViewById(R.id.layoutSettingsReceipts)
        layoutSettingsSounds = findViewById(R.id.layoutSettingsSounds)
        layoutSettingsMenu = findViewById(R.id.layoutSettingsMenu)

        btnMenuBack = findViewById(R.id.btnMenuBack)
        menuItemsContainer = findViewById(R.id.menuItemsContainer)

        btnDrawerAutoPrintToggle = findViewById(R.id.btnDrawerAutoPrintToggle)
        txtDrawerAutoPrintStatus = findViewById(R.id.txtDrawerAutoPrintStatus)
        switchDrawerAutoPrint = findViewById(R.id.switchDrawerAutoPrint)

        btnTabPrepare = findViewById(R.id.btnTabPrepare)
        btnTabHandover = findViewById(R.id.btnTabHandover)
        btnTabDone = findViewById(R.id.btnTabDone)
        txtTabPrepare = findViewById(R.id.txtTabPrepare)
        txtTabHandover = findViewById(R.id.txtTabHandover)
        txtTabDone = findViewById(R.id.txtTabDone)
        ordersContainer = findViewById(R.id.ordersContainer)
        txtNoOrders = findViewById(R.id.txtNoOrders)

        btnDetailBack = findViewById(R.id.btnDetailBack)
        btnDetailPrint = findViewById(R.id.btnDetailPrint)
        txtDetailHeaderTitle = findViewById(R.id.txtDetailHeaderTitle)
        txtDetailTimeVal = findViewById(R.id.txtDetailTimeVal)
        txtDetailTimeLabel = findViewById(R.id.txtDetailTimeLabel)
        txtDetailAddress = findViewById(R.id.txtDetailAddress)
        txtDetailOrderCode = findViewById(R.id.txtDetailOrderCode)
        txtDetailType = findViewById(R.id.txtDetailType)
        txtDetailCustomerName = findViewById(R.id.txtDetailCustomerName)
        txtDetailPaidBadge = findViewById(R.id.txtDetailPaidBadge)
        txtCustomerChevron = findViewById(R.id.txtCustomerChevron)
        layoutCustomerDetails = findViewById(R.id.layoutCustomerDetails)
        txtDetailCustomerPhone = findViewById(R.id.txtDetailCustomerPhone)
        txtDetailCustomerNotes = findViewById(R.id.txtDetailCustomerNotes)
        txtDetailItemsCountHeader = findViewById(R.id.txtDetailItemsCountHeader)
        layoutDetailItemsContainer = findViewById(R.id.layoutDetailItemsContainer)
        txtDetailSubtotal = findViewById(R.id.txtDetailSubtotal)
        txtDetailDeliveryFee = findViewById(R.id.txtDetailDeliveryFee)
        txtDetailTotal = findViewById(R.id.txtDetailTotal)
        btnDetailAction = findViewById(R.id.btnDetailAction)
        btnDetailAssignDriver = findViewById(R.id.btnDetailAssignDriver)
        btnToggleCustomerInfo = findViewById(R.id.btnToggleCustomerInfo)
        btnDrawerSwitchRestaurant = findViewById(R.id.btnDrawerSwitchRestaurant)
        txtDrawerActiveRestaurant = findViewById(R.id.txtDrawerActiveRestaurant)
        btnSubMenuManagement = findViewById(R.id.btnSubMenuManagement)

        btnReceiptsBack = findViewById(R.id.btnReceiptsBack)
        btnReceiptsMinus = findViewById(R.id.btnReceiptsMinus)
        btnReceiptsPlus = findViewById(R.id.btnReceiptsPlus)
        txtReceiptsCount = findViewById(R.id.txtReceiptsCount)
        btnReceiptsPrintTest = findViewById(R.id.btnReceiptsPrintTest)
        switchAutoPrint = findViewById(R.id.switchAutoPrint)

        btnSoundsBack = findViewById(R.id.btnSoundsBack)
        seekBarVolume = findViewById(R.id.seekBarVolume)
        txtSoundVolumeVal = findViewById(R.id.txtSoundVolumeVal)
    }

    // ─────────────────────────────────────────────
    // SCREEN NAVIGATION
    // ─────────────────────────────────────────────
    private fun showScreen(screen: Screen) {
        currentScreen = screen
        layoutOrderList.visibility = if (screen == Screen.ORDER_LIST) View.VISIBLE else View.GONE
        layoutOrderDetail.visibility = if (screen == Screen.ORDER_DETAIL) View.VISIBLE else View.GONE
        layoutSettingsReceipts.visibility = if (screen == Screen.SETTINGS_RECEIPTS) View.VISIBLE else View.GONE
        layoutSettingsSounds.visibility = if (screen == Screen.SETTINGS_SOUNDS) View.VISIBLE else View.GONE
        layoutSettingsMenu.visibility = if (screen == Screen.SETTINGS_MENU) View.VISIBLE else View.GONE
    }

    // ─────────────────────────────────────────────
    // DRAWER SETUP
    // ─────────────────────────────────────────────
    private fun setupDrawer() {
        btnHamburger.setOnClickListener { drawerLayout.openDrawer(GravityCompat.START) }
        btnDrawerClose.setOnClickListener { drawerLayout.closeDrawer(GravityCompat.START) }

        btnDrawerRefresh.setOnClickListener {
            drawerLayout.closeDrawer(GravityCompat.START)
            // fetchOrders posts result via SupabaseListener.onOrdersLoaded
            supabaseManager.fetchOrders()
        }

        // Stop taking orders toggle
        btnDrawerStopOrders.setOnClickListener {
            isStopOrdersActive = !isStopOrdersActive
            val iconView = btnDrawerStopOrders.findViewById<TextView>(R.id.txtDrawerStopOrdersIcon)
            val titleView = btnDrawerStopOrders.findViewById<TextView>(R.id.txtDrawerStopOrdersTitle)
            val descView = btnDrawerStopOrders.findViewById<TextView>(R.id.txtDrawerStopOrdersDesc)
            if (isStopOrdersActive) {
                iconView?.text = "▶"
                titleView?.text = "Start taking orders"
                descView?.text = "You're currently paused. Tap to resume."
            } else {
                iconView?.text = "⏸"
                titleView?.text = "Stop taking orders"
                descView?.text = "You're currently ready to accept new orders."
            }
        }

        // Management expander
        btnDrawerManagement.setOnClickListener {
            val isVisible = layoutDrawerManagementSub.visibility == View.VISIBLE
            layoutDrawerManagementSub.visibility = if (isVisible) View.GONE else View.VISIBLE
            txtDrawerManagementChevron.text = if (isVisible) "⌵" else "⌃"
        }

        // Settings expander
        btnDrawerSettings.setOnClickListener {
            val isVisible = layoutDrawerSettingsSub.visibility == View.VISIBLE
            layoutDrawerSettingsSub.visibility = if (isVisible) View.GONE else View.VISIBLE
            txtDrawerSettingsChevron.text = if (isVisible) "⌵" else "⌃"
        }

        // Sub-items navigation
        btnSubSounds.setOnClickListener {
            drawerLayout.closeDrawer(GravityCompat.START)
            showScreen(Screen.SETTINGS_SOUNDS)
        }
        btnSubReceipts.setOnClickListener {
            drawerLayout.closeDrawer(GravityCompat.START)
            showScreen(Screen.SETTINGS_RECEIPTS)
        }
        btnSubTodaySales.setOnClickListener {
            drawerLayout.closeDrawer(GravityCompat.START)
            val todayStr = SimpleDateFormat("yyyy-MM-day", Locale.getDefault()).format(Date())
            val todayOrders = ordersList.filter { it.createdAt.startsWith(todayStr.substring(0, 10)) }
            val count = todayOrders.size
            val revenue = todayOrders.sumOf { it.total }
            val onlineCount = todayOrders.count { it.paymentMethod.lowercase() == "online" }
            val cashCount = todayOrders.count { it.paymentMethod.lowercase() == "cash" || it.paymentMethod.lowercase() == "card" }

            androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("Today's Sales Report")
                .setMessage(
                    "Total Orders: $count\n" +
                    "Total Revenue: €${String.format(Locale.US, "%.2f", revenue)}\n\n" +
                    "Payment breakdown:\n" +
                    "• Online: $onlineCount order(s)\n" +
                    "• Cash/Card: $cashCount order(s)"
                )
                .setPositiveButton("Close", null)
                .show()
        }
        btnSubConnectivity.setOnClickListener {
            drawerLayout.closeDrawer(GravityCompat.START)
            val isSupabaseConnected = supabaseManager.isRealtimeConnected()
            val isPrinterConnected = printerHelper.isPrinterConnected()

            androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("Connectivity Status")
                .setMessage(
                    "• Supabase Database Realtime: ${if (isSupabaseConnected) "CONNECTED ✓" else "DISCONNECTED ✗"}\n" +
                    "• Sunmi Internal Printer: ${if (isPrinterConnected) "CONNECTED ✓" else "DISCONNECTED ✗"}\n" +
                    "• Target Restaurant ID: $merchantId"
                )
                .setPositiveButton("Close", null)
                .show()
        }
        btnSubLanguage.setOnClickListener {
            drawerLayout.closeDrawer(GravityCompat.START)
            val languages = arrayOf("English", "Nederlands (Dutch)", "Deutsch (German)")
            androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("Select Language")
                .setItems(languages) { _, which ->
                    Toast.makeText(this, "Language switched to ${languages[which]} (Requires restart)", Toast.LENGTH_SHORT).show()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
        btnSubDeviceInfo.setOnClickListener {
            drawerLayout.closeDrawer(GravityCompat.START)
            val service = printerHelper.getWoyouServiceInstance()
            val serial = try { service?.printerSerialNo ?: "N/A" } catch(e: Exception) { "N/A" }
            val version = try { service?.printerVersion ?: "N/A" } catch(e: Exception) { "N/A" }

            androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("Device Specification Info")
                .setMessage(
                    "• Brand: SUNMI\n" +
                    "• Model: V2s / V2 Pro\n" +
                    "• Printer SN: $serial\n" +
                    "• Printer OS Version: $version\n" +
                    "• Application Package: com.spoonful.pos\n" +
                    "• Build Version: 1.0.0 (Debug)"
                )
                .setPositiveButton("Close", null)
                .show()
        }

        btnDrawerSwitchRestaurant.setOnClickListener {
            drawerLayout.closeDrawer(GravityCompat.START)
            Toast.makeText(this, "Loading restaurants...", Toast.LENGTH_SHORT).show()
            supabaseManager.fetchMerchants { merchants ->
                if (merchants.isEmpty()) {
                    Toast.makeText(this, "Could not load restaurants", Toast.LENGTH_SHORT).show()
                    return@fetchMerchants
                }
                val names = merchants.map { it.second }.toTypedArray()
                androidx.appcompat.app.AlertDialog.Builder(this)
                    .setTitle("Select Restaurant")
                    .setItems(names) { _, which ->
                        val selected = merchants[which]
                        val newId = selected.first
                        val newName = selected.second
                        
                        getSharedPreferences("spoonful_prefs", MODE_PRIVATE).edit()
                            .putString("merchant_id", newId)
                            .apply()
                            
                        merchantId = newId
                        txtDrawerActiveRestaurant.text = newName
                        
                        ordersList.clear()
                        refreshOrderList()
                        supabaseManager.updateMerchantId(newId)
                        Toast.makeText(this, "Switched to $newName", Toast.LENGTH_SHORT).show()
                    }
                    .setNegativeButton("Cancel", null)
                    .show()
            }
        }

        btnSubMenuManagement.setOnClickListener {
            drawerLayout.closeDrawer(GravityCompat.START)
            loadMenuManagementScreen()
        }

        btnDrawerAutoPrintToggle.setOnClickListener {
            val newState = !isAutoPrintEnabled
            isAutoPrintEnabled = newState
            getSharedPreferences("spoonful_prefs", MODE_PRIVATE).edit()
                .putBoolean("auto_print", newState)
                .apply()
                
            switchDrawerAutoPrint.isChecked = newState
            switchAutoPrint.isChecked = newState
            txtDrawerAutoPrintStatus.text = if (newState) "Enabled" else "Disabled"
            txtDrawerAutoPrintStatus.setTextColor(Color.parseColor(if (newState) "#00A389" else "#EF4444"))
            
            Toast.makeText(this, "Auto-print ${if (newState) "enabled" else "disabled"}", Toast.LENGTH_SHORT).show()
        }
    }

    // ─────────────────────────────────────────────
    // TABS SETUP
    // ─────────────────────────────────────────────
    private fun setupTabs() {
        btnTabPrepare.setOnClickListener {
            currentTab = "prepare"
            updateTabSelection()
            refreshOrderList()
        }
        btnTabHandover.setOnClickListener {
            currentTab = "handover"
            updateTabSelection()
            refreshOrderList()
        }
        btnTabDone.setOnClickListener {
            currentTab = "done"
            updateTabSelection()
            refreshOrderList()
        }
        updateTabSelection()
    }

    private fun updateTabSelection() {
        // Reset all tabs to unselected
        btnTabPrepare.setBackgroundResource(R.drawable.tab_bg_unselected)
        btnTabHandover.setBackgroundResource(R.drawable.tab_bg_unselected)
        btnTabDone.setBackgroundResource(R.drawable.tab_bg_unselected)
        txtTabPrepare.setTextColor(Color.parseColor("#64748B"))
        txtTabHandover.setTextColor(Color.parseColor("#64748B"))
        txtTabDone.setTextColor(Color.parseColor("#64748B"))

        // Activate selected tab
        val (selectedLayout, selectedText) = when (currentTab) {
            "prepare" -> Pair(btnTabPrepare, txtTabPrepare)
            "handover" -> Pair(btnTabHandover, txtTabHandover)
            "done" -> Pair(btnTabDone, txtTabDone)
            else -> Pair(btnTabPrepare, txtTabPrepare)
        }
        selectedLayout.setBackgroundResource(R.drawable.tab_bg_selected)
        selectedText.setTextColor(Color.WHITE)

        // Update Done tab count
        val doneCount = ordersList.count { it.status.lowercase() in listOf("completed", "cancelled") }
        txtTabDone.text = "Done ($doneCount)"
    }

    // ─────────────────────────────────────────────
    // ORDER LIST RENDERING
    // ─────────────────────────────────────────────
    private fun refreshOrderList() {
        updateTabSelection()
        ordersContainer.removeAllViews()

        val filteredOrders = when (currentTab) {
            "prepare" -> ordersList.filter { it.status.lowercase() in listOf("incoming", "preparing") }
            "handover" -> ordersList.filter { it.status.lowercase() == "ready" }
            "done" -> ordersList.filter { it.status.lowercase() in listOf("completed", "cancelled") }
            else -> ordersList
        }

        if (filteredOrders.isEmpty()) {
            txtNoOrders.visibility = View.VISIBLE
        } else {
            txtNoOrders.visibility = View.GONE
            filteredOrders.forEach { order ->
                ordersContainer.addView(buildOrderCard(order))
            }
        }
    }

    private fun buildOrderCard(order: Order): View {
        val card = androidx.cardview.widget.CardView(this).apply {
            radius = dp(12).toFloat()
            cardElevation = dp(1).toFloat()
            setCardBackgroundColor(Color.WHITE)
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(12) }
            setOnClickListener { openOrderDetail(order) }
        }

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(14), dp(14), dp(14), dp(14))
        }

        // Left: Time badge circle
        val timeBadge = buildTimeBadge(order)
        root.addView(timeBadge)

        // Center: Order info
        val infoLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
                marginStart = dp(14)
                marginEnd = dp(8)
            }
        }

        // First name only
        val firstName = order.customerName?.split(" ")?.firstOrNull() ?: "Customer"
        val customerTxt = TextView(this).apply {
            text = firstName
            setTextColor(Color.parseColor("#1E1E24"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            setTypeface(null, Typeface.BOLD)
        }
        infoLayout.addView(customerTxt)

        // Order number short + type icon
        val typeIcon = when (order.type.lowercase()) {
            "delivery" -> "🛵"
            "pickup" -> "🏃"
            else -> "🍽️"
        }
        val subtitleTxt = TextView(this).apply {
            text = "$typeIcon  ${order.orderNumber}"
            setTextColor(Color.parseColor("#64748B"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
        }
        infoLayout.addView(subtitleTxt)

        // Items summary
        val itemCount = order.items.sumOf { it.quantity }
        val itemsSummary = TextView(this).apply {
            text = "$itemCount item${if (itemCount != 1) "s" else ""}"
            setTextColor(Color.parseColor("#94A3B8"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
        }
        infoLayout.addView(itemsSummary)

        root.addView(infoLayout)

        // Right: Price + print dot
        val rightCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.END or Gravity.CENTER_VERTICAL
            minimumWidth = dp(60)
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }

        val priceTxt = TextView(this).apply {
            text = String.format(Locale.US, "€%.2f", order.total)
            setTextColor(Color.parseColor("#1E1E24"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            setTypeface(null, Typeface.BOLD)
            setSingleLine(true)
        }
        rightCol.addView(priceTxt)

        // Print status dot
        val printDot = View(this).apply {
            val size = dp(8)
            layoutParams = LinearLayout.LayoutParams(size, size).apply { topMargin = dp(4) ; gravity = Gravity.END }
            val dotColor = if (order.printed) "#00A389" else "#CBD5E1"
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor(dotColor))
            }
        }
        rightCol.addView(printDot)

        root.addView(rightCol)
        card.addView(root)
        return card
    }

    private fun buildTimeBadge(order: Order): FrameLayout {
        val size = dp(52)
        val frame = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(size, size)
        }

        val bg = GradientDrawable().apply { shape = GradientDrawable.OVAL }
        val inner = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            layoutParams = FrameLayout.LayoutParams(size, size)
        }

        val isDone = order.status.lowercase() in listOf("completed", "cancelled")
        if (isDone) {
            bg.setColor(Color.parseColor("#E8FFF5"))
            bg.setStroke(dp(2), Color.parseColor("#00A389"))
            frame.background = bg
            val check = TextView(this).apply {
                text = "✓"
                setTextColor(Color.parseColor("#00A389"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
                setTypeface(null, Typeface.BOLD)
                gravity = Gravity.CENTER
            }
            inner.addView(check)
        } else {
            val minutes = minutesSince(order.createdAt)
            val (bgColor, strokeColor, textColor) = when {
                minutes < 10 -> Triple("#E8FFF5", "#00A389", "#00A389")
                minutes < 20 -> Triple("#FFF8E8", "#FF9100", "#FF9100")
                else -> Triple("#FFF0F0", "#EF4444", "#EF4444")
            }
            bg.setColor(Color.parseColor(bgColor))
            bg.setStroke(dp(2), Color.parseColor(strokeColor))
            frame.background = bg

            val numTxt = TextView(this).apply {
                text = "$minutes"
                setTextColor(Color.parseColor(textColor))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
                setTypeface(null, Typeface.BOLD)
                gravity = Gravity.CENTER
            }
            val minTxt = TextView(this).apply {
                text = "min"
                setTextColor(Color.parseColor(textColor))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 9f)
                gravity = Gravity.CENTER
            }
            inner.addView(numTxt)
            inner.addView(minTxt)
        }

        frame.addView(inner)
        return frame
    }

    // ─────────────────────────────────────────────
    // ORDER DETAIL SCREEN
    // ─────────────────────────────────────────────
    private fun setupDetailScreen() {
        btnDetailBack.setOnClickListener { showScreen(Screen.ORDER_LIST) }

        btnToggleCustomerInfo.setOnClickListener {
            val isVisible = layoutCustomerDetails.visibility == View.VISIBLE
            layoutCustomerDetails.visibility = if (isVisible) View.GONE else View.VISIBLE
            txtCustomerChevron.text = if (isVisible) "⌵" else "⌃"
        }

        btnDetailAction.setOnClickListener {
            val order = selectedOrder ?: return@setOnClickListener
            val targetStatus = when (order.status.lowercase()) {
                "incoming" -> "preparing"
                "preparing" -> "ready"
                "ready" -> "completed"
                else -> return@setOnClickListener
            }

            // Optimistic UI update
            order.status = targetStatus
            showScreen(Screen.ORDER_LIST)
            refreshOrderList()

            supabaseManager.updateOrderPrintedAndStatus(order.id, order.printed, targetStatus) { success ->
                if (success) {
                    // Push status change back to Hyperzod (fire-and-forget)
                    supabaseManager.notifyHyperzodStatusUpdate(
                        orderNumber = order.orderNumber,
                        hyperzodOrderId = order.hyperzodOrderId,
                        status = targetStatus
                    )
                } else {
                    // Revert optimistic update on failure
                    runOnUiThread {
                        order.status = when (targetStatus) {
                            "preparing" -> "incoming"
                            "ready" -> "preparing"
                            "completed" -> "ready"
                            else -> order.status
                        }
                        refreshOrderList()
                        Toast.makeText(this@MainActivity, "Status update failed. Please try again.", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }

        btnDetailPrint.setOnClickListener {
            selectedOrder?.let { order ->
                val service = printerHelper.getWoyouServiceInstance()
                if (service == null) {
                    Toast.makeText(this, "Printer: Offline. Try restarting the app.", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                val status = try { service.getPrinterStatus() } catch(e: Exception) { 4 }
                if (status == 2) {
                    Toast.makeText(this, "Printer Error: Out of paper! Please load paper.", Toast.LENGTH_LONG).show()
                    return@setOnClickListener
                } else if (status == 3) {
                    Toast.makeText(this, "Printer Error: Overheated! Please wait.", Toast.LENGTH_LONG).show()
                    return@setOnClickListener
                } else if (status == 4) {
                    Toast.makeText(this, "Printer Error: General Exception/Door open.", Toast.LENGTH_LONG).show()
                    return@setOnClickListener
                }

                // Print receiptCopiesCount copies
                var copiesLeft = receiptCopiesCount
                fun printNext() {
                    if (copiesLeft <= 0) {
                        runOnUiThread {
                            val msg = if (receiptCopiesCount > 1) "$receiptCopiesCount receipts sent to printer!" else "Receipt sent to printer!"
                            Toast.makeText(this@MainActivity, msg, Toast.LENGTH_SHORT).show()
                            if (!order.printed) {
                                order.printed = true
                                printedOrderIds.add(order.id ?: "")
                                refreshOrderList()
                            }
                        }
                        return
                    }
                    copiesLeft--
                    printerHelper.printReceipt(order, txtDrawerActiveRestaurant.text.toString()) { success ->
                        if (success) {
                            printNext()
                        } else {
                            runOnUiThread {
                                Toast.makeText(this@MainActivity, "Printing failed. Please check printer.", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                }
                printNext()
            }
        }

        btnDetailAssignDriver.setOnClickListener {
            val order = selectedOrder ?: return@setOnClickListener
            Toast.makeText(this, "Loading drivers...", Toast.LENGTH_SHORT).show()
            supabaseManager.fetchDrivers { drivers ->
                if (drivers.isEmpty()) {
                    Toast.makeText(this, "No drivers found for this restaurant", Toast.LENGTH_SHORT).show()
                    return@fetchDrivers
                }
                
                val driverNames = drivers.map { it.get("name")?.asString ?: "Unnamed Driver" }.toTypedArray()
                
                androidx.appcompat.app.AlertDialog.Builder(this)
                    .setTitle("Assign Driver")
                    .setItems(driverNames) { _, which ->
                        val driverName = driverNames[which]
                        
                        val durations = arrayOf("15 mins", "20 mins", "30 mins", "40 mins", "50 mins")
                        androidx.appcompat.app.AlertDialog.Builder(this@MainActivity)
                            .setTitle("Select Delivery Time")
                            .setItems(durations) { _, durWhich ->
                                val duration = durations[durWhich]
                                Toast.makeText(this@MainActivity, "Assigning $driverName ($duration)...", Toast.LENGTH_SHORT).show()
                                supabaseManager.assignDriverToOrder(order.id, driverName, duration) { success ->
                                    runOnUiThread {
                                        if (success) {
                                            Toast.makeText(this@MainActivity, "Driver assigned!", Toast.LENGTH_SHORT).show()
                                            openOrderDetail(order)
                                        } else {
                                            Toast.makeText(this@MainActivity, "Assignment failed", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                }
                            }
                            .show()
                    }
                    .setNegativeButton("Cancel", null)
                    .show()
            }
        }
    }

    private fun openOrderDetail(order: Order) {
        selectedOrder = order

        // Header title
        txtDetailHeaderTitle.text = when (currentTab) {
            "prepare" -> "Prepare"
            "handover" -> "Handover"
            "done" -> "Done"
            else -> "Order"
        }

        // Time badge
        val isDone = order.status.lowercase() in listOf("completed", "cancelled")
        if (isDone) {
            txtDetailTimeVal.text = "✓"
            txtDetailTimeLabel.text = ""
            txtDetailTimeVal.setTextColor(Color.parseColor("#00A389"))
        } else {
            val mins = minutesSince(order.createdAt)
            txtDetailTimeVal.text = "$mins"
            txtDetailTimeLabel.text = "mins"
            val textColor = when {
                mins < 10 -> "#00A389"
                mins < 20 -> "#FF9100"
                else -> "#EF4444"
            }
            txtDetailTimeVal.setTextColor(Color.parseColor(textColor))
            txtDetailTimeLabel.setTextColor(Color.parseColor(textColor))
        }

        // Address & order info
        val address = order.customerAddress ?: (order.customerName ?: "No address")
        txtDetailAddress.text = address
        txtDetailOrderCode.text = "#${order.orderNumber.takeLast(6)}"
        val typeIcon = when (order.type.lowercase()) {
            "delivery" -> "🛵 Delivery"
            "pickup" -> "🏃 Pickup"
            else -> "🍽️ Dine In"
        }
        txtDetailType.text = typeIcon

        // Customer info
        val firstName = order.customerName?.split(" ")?.firstOrNull() ?: "Customer"
        txtDetailCustomerName.text = firstName

        val isPaid = order.paymentStatus.lowercase() == "paid"
        txtDetailPaidBadge.text = if (isPaid) "Paid" else "Unpaid"
        txtDetailPaidBadge.setTextColor(Color.parseColor(if (isPaid) "#00A389" else "#EF4444"))

        txtDetailCustomerPhone.text = if (!order.customerPhone.isNullOrEmpty()) "📞 ${order.customerPhone}" else "No phone"
        val parsedNotes = parseCustomerNotes(order.notes)
        txtDetailCustomerNotes.text = if (parsedNotes.isNotEmpty()) parsedNotes else "No delivery notes"

        // Items
        txtDetailItemsCountHeader.text = "${order.items.sumOf { it.quantity }} item${if (order.items.sumOf { it.quantity } != 1) "s" else ""}"
        layoutDetailItemsContainer.removeAllViews()
        order.items.forEachIndexed { i, item ->
            if (i > 0) layoutDetailItemsContainer.addView(createItemDivider())
            layoutDetailItemsContainer.addView(buildDetailItemRow(item))
        }

        // Totals
        txtDetailSubtotal.text = String.format(Locale.US, "€%.2f", order.subtotal)
        txtDetailDeliveryFee.text = if (order.deliveryFee > 0) String.format(Locale.US, "€%.2f", order.deliveryFee) else "Free"
        txtDetailTotal.text = String.format(Locale.US, "€%.2f", order.total)

        // Action button
        val actionLabel = when (order.status.lowercase()) {
            "incoming" -> "ACCEPT ORDER"
            "preparing" -> "ORDER IS READY"
            "ready" -> "MARK AS DELIVERED"
            else -> null
        }
        if (actionLabel != null) {
            btnDetailAction.visibility = View.VISIBLE
            btnDetailAction.text = actionLabel
        } else {
            btnDetailAction.visibility = View.GONE
        }

        // Driver assignment visibility
        val isDelivery = order.type.lowercase() == "delivery"
        val canAssignDriver = isDelivery && (order.status.lowercase() == "preparing" || order.status.lowercase() == "ready")
        btnDetailAssignDriver.visibility = if (canAssignDriver) View.VISIBLE else View.GONE

        showScreen(Screen.ORDER_DETAIL)
    }

    private fun buildDetailItemRow(item: OrderItem): LinearLayout {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.TOP
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(10) }
        }

        // Qty badge
        val qtyBadge = TextView(this).apply {
            text = "${item.quantity}×"
            setTextColor(Color.parseColor("#D8581B"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setTypeface(null, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(dp(36), ViewGroup.LayoutParams.WRAP_CONTENT)
        }
        row.addView(qtyBadge)

        // Name + notes block
        val nameCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }
        val nameTxt = TextView(this).apply {
            text = item.name
            setTextColor(Color.parseColor("#1E1E24"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
        }
        nameCol.addView(nameTxt)

        if (!item.notes.isNullOrEmpty()) {
            val notesTxt = TextView(this).apply {
                text = "Note: ${item.notes}"
                setTextColor(Color.parseColor("#94A3B8"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            }
            nameCol.addView(notesTxt)
        }
        row.addView(nameCol)

        // Price
        val priceTxt = TextView(this).apply {
            text = String.format(Locale.US, "€%.2f", item.price * item.quantity)
            setTextColor(Color.parseColor("#475569"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                marginStart = dp(8)
            }
        }
        row.addView(priceTxt)
        return row
    }

    private fun createItemDivider(): View {
        return View(this).apply {
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 1).apply {
                topMargin = dp(4)
                bottomMargin = dp(10)
            }
            setBackgroundColor(Color.parseColor("#F1F5F9"))
        }
    }

    // ─────────────────────────────────────────────
    // RECEIPTS SETTINGS
    // ─────────────────────────────────────────────
    private fun setupReceiptsSettings() {
        btnReceiptsBack.setOnClickListener { showScreen(Screen.ORDER_LIST) }

        btnReceiptsMinus.setOnClickListener {
            if (receiptCopiesCount > 1) {
                receiptCopiesCount--
                txtReceiptsCount.text = "$receiptCopiesCount"
            }
        }
        btnReceiptsPlus.setOnClickListener {
            if (receiptCopiesCount < 5) {
                receiptCopiesCount++
                txtReceiptsCount.text = "$receiptCopiesCount"
            }
        }
        btnReceiptsPrintTest.setOnClickListener {
            printerHelper.printTestPage()
        }

        switchAutoPrint.isChecked = isAutoPrintEnabled
        switchAutoPrint.setOnCheckedChangeListener { _, isChecked ->
            isAutoPrintEnabled = isChecked
            getSharedPreferences("spoonful_prefs", MODE_PRIVATE).edit().putBoolean("auto_print", isChecked).apply()
            
            // Sync drawer switch
            switchDrawerAutoPrint.isChecked = isChecked
            txtDrawerAutoPrintStatus.text = if (isChecked) "Enabled" else "Disabled"
            txtDrawerAutoPrintStatus.setTextColor(Color.parseColor(if (isChecked) "#00A389" else "#EF4444"))
        }
    }

    // ─────────────────────────────────────────────
    // SOUNDS SETTINGS
    // ─────────────────────────────────────────────
    private fun setupSoundsSettings() {
        btnSoundsBack.setOnClickListener { showScreen(Screen.ORDER_LIST) }

        seekBarVolume.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(sb: SeekBar?, progress: Int, fromUser: Boolean) {
                txtSoundVolumeVal.text = "Volume $progress%"
            }
            override fun onStartTrackingTouch(sb: SeekBar?) {}
            override fun onStopTrackingTouch(sb: SeekBar?) {}
        })
    }

    // ─────────────────────────────────────────────
    // STATUS INDICATORS
    // ─────────────────────────────────────────────
    private fun updateSupabaseStatus(connected: Boolean) {
        val color = if (connected) "#00A389" else "#FF5252"
        dotSupabase.background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(Color.parseColor(color))
        }
        txtSupabaseStatus.text = if (connected) "DB: Connected" else "DB: Disconnected"
    }

    private fun updatePrinterStatus(connected: Boolean) {
        val color = if (connected) "#00A389" else "#FF5252"
        dotPrinter.background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(Color.parseColor(color))
        }
        txtPrinterStatus.text = if (connected) "Printer: Ready" else "Printer: Offline"
    }

    // ─────────────────────────────────────────────
    // TIMER TICK - Refreshes order times every 60s
    // ─────────────────────────────────────────────
    private fun setupTimerTick() {
        timerRunnable = object : Runnable {
            override fun run() {
                if (currentScreen == Screen.ORDER_LIST) refreshOrderList()
                handler.postDelayed(this, 60_000)
            }
        }
        handler.postDelayed(timerRunnable, 60_000)
    }

    // ─────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────
    private fun minutesSince(createdAt: String): Int {
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val date = sdf.parse(createdAt.substringBefore("+").substringBefore("Z").let { it }) ?: return 0
            val diff = System.currentTimeMillis() - date.time
            (diff / 60_000).toInt().coerceAtLeast(0)
        } catch (e: Exception) { 0 }
    }

    // ─────────────────────────────────────────────
    // MOCK DATA
    // ─────────────────────────────────────────────
    private fun loadMockData() {
        ordersList.clear()
        val now = Calendar.getInstance()
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }

        fun ago(minutes: Int): String {
            val cal = now.clone() as Calendar
            cal.add(Calendar.MINUTE, -minutes)
            return sdf.format(cal.time) + "Z"
        }

        ordersList.add(Order(
            id = "mock-1",
            orderNumber = "HZ-1994-32",
            customerName = "Alexandr Filippov",
            customerPhone = "+31 6 12345678",
            items = listOf(
                OrderItem("Pizza Margherita", 1, 12.50, "extra cheese, well done"),
                OrderItem("Coca Cola Zero", 2, 2.50, null)
            ),
            subtotal = 17.50, tax = 1.58, deliveryFee = 2.50, discount = 0.0, total = 21.58,
            status = "incoming", type = "delivery", paymentMethod = "online", paymentStatus = "paid",
            notes = "Leave on the doorstep and ring the bell once, thanks!",
            printed = false,
            customerAddress = "Deurningerstraat 91B, 7514 JH Enschede",
            createdAt = ago(5)
        ))

        ordersList.add(Order(
            id = "mock-2",
            orderNumber = "HZ-8812-09",
            customerName = "Elena Rostova",
            customerPhone = "+31 6 87654321",
            items = listOf(
                OrderItem("Double Beef Burger", 2, 9.99, "no onions"),
                OrderItem("French Fries Large", 1, 3.50, "extra crispy")
            ),
            subtotal = 23.48, tax = 2.11, deliveryFee = 0.0, discount = 2.0, total = 23.59,
            status = "preparing", type = "pickup", paymentMethod = "card", paymentStatus = "paid",
            notes = "Customer will collect in person around 14:15",
            printed = true,
            customerAddress = null,
            createdAt = ago(18)
        ))

        ordersList.add(Order(
            id = "mock-3",
            orderNumber = "HZ-4309-88",
            customerName = "John Doe",
            customerPhone = null,
            items = listOf(OrderItem("Chicken Caesar Salad", 1, 14.00, null)),
            subtotal = 14.0, tax = 1.26, deliveryFee = 0.0, discount = 0.0, total = 15.26,
            status = "ready", type = "dine_in", paymentMethod = "cash", paymentStatus = "pending",
            notes = "Table 4 - bring extra napkins",
            printed = true,
            customerAddress = null,
            createdAt = ago(45)
        ))

        ordersList.add(Order(
            id = "mock-4",
            orderNumber = "HZ-3301-11",
            customerName = "Sara de Vries",
            customerPhone = "+31 6 55512345",
            items = listOf(
                OrderItem("Butter Chicken", 1, 13.50, null),
                OrderItem("Garlic Naan", 2, 2.0, null)
            ),
            subtotal = 17.50, tax = 1.58, deliveryFee = 1.99, discount = 0.0, total = 21.07,
            status = "completed", type = "delivery", paymentMethod = "online", paymentStatus = "paid",
            notes = null,
            printed = true,
            customerAddress = "Hengelosestraat 12, 7521 AC Enschede",
            createdAt = ago(62)
        ))

        refreshOrderList()
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

    private fun setupSwitchColorStates(switchView: com.google.android.material.switchmaterial.SwitchMaterial) {
        val thumbStates = android.content.res.ColorStateList(
            arrayOf(
                intArrayOf(android.R.attr.state_checked),
                intArrayOf(-android.R.attr.state_checked)
            ),
            intArrayOf(
                Color.parseColor("#D8581B"), // Orange when checked
                Color.parseColor("#94A3B8")  // Grey when unchecked
            )
        )

        val trackStates = android.content.res.ColorStateList(
            arrayOf(
                intArrayOf(android.R.attr.state_checked),
                intArrayOf(-android.R.attr.state_checked)
            ),
            intArrayOf(
                Color.parseColor("#FFD0B3"), // Light orange when checked
                Color.parseColor("#E2E8F0")  // Light grey when unchecked
            )
        )

        switchView.thumbTintList = thumbStates
        switchView.trackTintList = trackStates
    }

    private fun setupMenuManagement() {
        btnMenuBack.setOnClickListener { showScreen(Screen.ORDER_LIST) }
    }

    private fun loadMenuManagementScreen() {
        menuItemsContainer.removeAllViews()
        val loadingTxt = TextView(this).apply {
            text = "Loading items..."
            setTextColor(Color.parseColor("#64748B"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(40) }
        }
        menuItemsContainer.addView(loadingTxt)

        showScreen(Screen.SETTINGS_MENU)

        supabaseManager.fetchProducts { products ->
            runOnUiThread {
                menuItemsContainer.removeAllViews()
                if (products.isEmpty()) {
                    val emptyTxt = TextView(this@MainActivity).apply {
                        text = "No products found for this restaurant."
                        setTextColor(Color.parseColor("#64748B"))
                        setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                        gravity = Gravity.CENTER
                        layoutParams = LinearLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.WRAP_CONTENT
                        ).apply { topMargin = dp(40) }
                    }
                    menuItemsContainer.addView(emptyTxt)
                    return@runOnUiThread
                }

                val grouped = products.groupBy { it.get("category_name")?.asString ?: "General" }

                for ((categoryName, items) in grouped) {
                    val categoryHeader = TextView(this@MainActivity).apply {
                        text = categoryName.uppercase()
                        setTextColor(Color.parseColor("#D8581B"))
                        setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                        setTypeface(null, Typeface.BOLD)
                        layoutParams = LinearLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.WRAP_CONTENT
                        ).apply {
                            topMargin = dp(16)
                            bottomMargin = dp(8)
                        }
                    }
                    menuItemsContainer.addView(categoryHeader)

                    for (product in items) {
                        val card = androidx.cardview.widget.CardView(this@MainActivity).apply {
                            radius = dp(12).toFloat()
                            cardElevation = dp(1).toFloat()
                            useCompatPadding = true
                            layoutParams = LinearLayout.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.WRAP_CONTENT
                            ).apply { bottomMargin = dp(8) }
                        }

                        val row = LinearLayout(this@MainActivity).apply {
                            orientation = LinearLayout.HORIZONTAL
                            gravity = Gravity.CENTER_VERTICAL
                            setPadding(dp(16), dp(14), dp(16), dp(14))
                            setBackgroundColor(Color.WHITE)
                        }

                        val infoLayout = LinearLayout(this@MainActivity).apply {
                            orientation = LinearLayout.VERTICAL
                            layoutParams = LinearLayout.LayoutParams(
                                0,
                                ViewGroup.LayoutParams.WRAP_CONTENT,
                                1f
                            )
                        }

                        val nameTxt = TextView(this@MainActivity).apply {
                            text = product.get("name")?.asString ?: "Unnamed Dish"
                            setTextColor(Color.parseColor("#1E1E24"))
                            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                            setTypeface(null, Typeface.BOLD)
                        }

                        val priceVal = product.get("price")?.asDouble ?: 0.0
                        val priceTxt = TextView(this@MainActivity).apply {
                            text = String.format(Locale.US, "€%.2f", priceVal)
                            setTextColor(Color.parseColor("#64748B"))
                            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                            layoutParams = LinearLayout.LayoutParams(
                                ViewGroup.LayoutParams.WRAP_CONTENT,
                                ViewGroup.LayoutParams.WRAP_CONTENT
                            ).apply { topMargin = dp(2) }
                        }

                        infoLayout.addView(nameTxt)
                        infoLayout.addView(priceTxt)

                        val stockSwitch = com.google.android.material.switchmaterial.SwitchMaterial(this@MainActivity).apply {
                            isChecked = product.get("in_stock")?.asBoolean != false
                            setupSwitchColorStates(this)
                            
                            setOnCheckedChangeListener { _, isChecked ->
                                val productId = product.get("product_id")?.asString ?: ""
                                if (productId.isNotEmpty()) {
                                    supabaseManager.updateProductStock(productId, isChecked) { success ->
                                        runOnUiThread {
                                            if (success) {
                                                product.addProperty("in_stock", isChecked)
                                                Toast.makeText(
                                                    this@MainActivity,
                                                    "${product.get("name")?.asString} status updated!",
                                                    Toast.LENGTH_SHORT
                                                ).show()
                                            } else {
                                                this@apply.isChecked = !isChecked
                                                Toast.makeText(
                                                    this@MainActivity,
                                                    "Failed to update stock",
                                                    Toast.LENGTH_SHORT
                                                ).show()
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        row.addView(infoLayout)
                        row.addView(stockSwitch)
                        card.addView(row)
                        card.setContentPadding(dp(16), dp(12), dp(16), dp(12))
                        menuItemsContainer.addView(card)
                    }
                }
            }
        }
    }
}
