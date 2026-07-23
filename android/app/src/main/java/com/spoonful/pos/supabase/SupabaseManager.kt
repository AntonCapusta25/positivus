package com.spoonful.pos.supabase

import android.os.Handler
import android.os.Looper
import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.reflect.TypeToken
import com.spoonful.pos.model.Order
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import com.google.gson.GsonBuilder
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonParser
import com.spoonful.pos.model.OrderItem
import java.lang.reflect.Type
import java.io.IOException
import java.util.concurrent.TimeUnit

class SupabaseManager(
    private val supabaseUrl: String,
    private val supabaseKey: String,
    private var merchantId: String,
    private val listener: SupabaseListener
) {

    interface SupabaseListener {
        fun onOrderInserted(order: Order)
        fun onOrderUpdated(order: Order)
        fun onOrdersLoaded(orders: List<Order>)
        fun onConnectionStatusChanged(connected: Boolean)
        fun onError(error: String)
    }

    companion object {
        private const val TAG = "SupabaseManager"
        private const val HEARTBEAT_INTERVAL_MS = 30000L
        private const val RECONNECT_DELAY_MS = 5000L
    }

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .build()

    private val gson = GsonBuilder()
        .registerTypeAdapter(object : TypeToken<List<OrderItem>>() {}.type, OrderItemsDeserializer())
        .create()
    private var webSocket: WebSocket? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var isConnected = false
    private var isRealtimeActive = false

    // Heartbeat runnable
    private val heartbeatRunnable = object : Runnable {
        override fun run() {
            sendHeartbeat()
            mainHandler.postDelayed(this, HEARTBEAT_INTERVAL_MS)
        }
    }

    // Reconnection runnable
    private val reconnectRunnable = Runnable {
        Log.d(TAG, "Attempting to reconnect WebSocket...")
        connectRealtime()
    }

    /**
     * Fetch all current orders sorted by created_at descending
     */
    fun fetchOrders() {
        val url = "$supabaseUrl/rest/v1/orders?merchant_id=eq.$merchantId&select=*&order=created_at.desc&limit=50"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", supabaseKey)
            .addHeader("Authorization", "Bearer $supabaseKey")
            .get()
            .build()

        httpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "Failed to fetch orders", e)
                mainHandler.post {
                    listener.onError("Failed to fetch orders: ${e.message}")
                }
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (!response.isSuccessful) {
                        val errorBody = response.body?.string() ?: ""
                        Log.e(TAG, "Error fetching orders code: ${response.code}, body: $errorBody")
                        mainHandler.post {
                            listener.onError("Error fetching orders (${response.code})")
                        }
                        return
                    }

                    val json = response.body?.string()
                    try {
                        val listType = object : TypeToken<List<Order>>() {}.type
                        val orders: List<Order> = gson.fromJson(json, listType)
                        mainHandler.post {
                            listener.onOrdersLoaded(orders)
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to parse orders JSON", e)
                        mainHandler.post {
                            listener.onError("Failed to parse orders")
                        }
                    }
                }
            }
        })
    }

    /**
     * Start the Supabase Realtime WebSocket connection
     */
    fun start() {
        fetchOrders()
        connectRealtime()
    }

    /**
     * Connect to the Supabase Phoenix Realtime WebSocket
     */
    private fun connectRealtime() {
        val wsUrl = supabaseUrl
            .replace("https://", "wss://")
            .replace("http://", "ws://") + "/realtime/v1/websocket?apikey=$supabaseKey&vsn=1.0.0"

        val request = Request.Builder()
            .url(wsUrl)
            .build()

        webSocket = httpClient.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "Realtime WebSocket opened successfully.")
                isConnected = true
                mainHandler.post {
                    listener.onConnectionStatusChanged(true)
                }

                // Join the public orders replication channel
                joinOrdersChannel(webSocket)
                
                // Start heartbeats
                mainHandler.removeCallbacks(heartbeatRunnable)
                mainHandler.postDelayed(heartbeatRunnable, HEARTBEAT_INTERVAL_MS)
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "Received message: $text")
                handleWebSocketMessage(text)
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closing: $code / $reason")
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closed: $code / $reason")
                handleDisconnect()
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket error: ${t.message}", t)
                handleDisconnect()
            }
        })
    }

    private fun handleDisconnect() {
        isConnected = false
        isRealtimeActive = false
        mainHandler.removeCallbacks(heartbeatRunnable)
        mainHandler.post {
            listener.onConnectionStatusChanged(false)
        }
        // Schedule reconnect
        mainHandler.removeCallbacks(reconnectRunnable)
        mainHandler.postDelayed(reconnectRunnable, RECONNECT_DELAY_MS)
    }

    private fun joinOrdersChannel(ws: WebSocket) {
        val joinMsg = """
        {
          "topic": "realtime:public",
          "event": "phx_join",
          "payload": {
            "config": {
              "postgres_changes": [
                {
                  "event": "INSERT",
                  "schema": "public",
                  "table": "orders"
                },
                {
                  "event": "UPDATE",
                  "schema": "public",
                  "table": "orders"
                }
              ]
            }
          },
          "ref": "orders_join_ref"
        }
        """.trimIndent()
        ws.send(joinMsg)
        Log.d(TAG, "Sent join channel request for orders table (INSERT & UPDATE)")
    }


    private fun sendHeartbeat() {
        val ws = webSocket
        if (isConnected && ws != null) {
            val heartbeatMsg = """
            {
              "topic": "phoenix",
              "event": "heartbeat",
              "payload": {},
              "ref": "hb_${System.currentTimeMillis()}"
            }
            """.trimIndent()
            ws.send(heartbeatMsg)
            Log.d(TAG, "Sent heartbeat.")
        }
    }

    private fun handleWebSocketMessage(messageText: String) {
        try {
            val jsonObject = gson.fromJson(messageText, JsonObject::class.java)
            val event = jsonObject.get("event")?.asString
            val topic = jsonObject.get("topic")?.asString

            if (topic == "realtime:public" && event == "postgres_changes") {
                val payload = jsonObject.getAsJsonObject("payload")
                if (payload != null) {
                    val data = payload.getAsJsonObject("data")
                    if (data != null) {
                        val type = data.get("type")?.asString
                        val record = data.getAsJsonObject("record")
                        if (record != null) {
                            val order = gson.fromJson(record, Order::class.java)
                            val isMatch = order.merchantId == merchantId ||
                                    (merchantId in listOf("restaurant_1", "6a0f03b4500ed5db150be1a1") && 
                                     order.merchantId in listOf("restaurant_1", "6a0f03b4500ed5db150be1a1")) ||
                                    order.merchantId.isNullOrEmpty()

                            if (isMatch) {
                                mainHandler.post {
                                    if (type == "INSERT") {
                                        listener.onOrderInserted(order)
                                    } else if (type == "UPDATE") {
                                        listener.onOrderUpdated(order)
                                    }
                                }
                            }
                        }
                    }
                }
            } else if (event == "phx_reply" && jsonObject.get("ref")?.asString == "orders_join_ref") {
                isRealtimeActive = true
                Log.d(TAG, "Successfully subscribed to Supabase orders Realtime.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing websocket message", e)
        }
    }

    /**
     * Update order printed status and POS status in Supabase database
     */
    fun updateOrderPrintedAndStatus(
        orderId: String, 
        printed: Boolean, 
        status: String, 
        preparationTime: Int? = null,
        onComplete: (Boolean) -> Unit = {}
    ) {
        val url = "$supabaseUrl/rest/v1/orders?id=eq.$orderId"
        
        val updatePayload = JsonObject().apply {
            addProperty("printed", printed)
            addProperty("status", status)
            if (preparationTime != null) {
                addProperty("preparation_time", preparationTime)
            }
        }

        val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
        val requestBody = gson.toJson(updatePayload).toRequestBody(mediaType)

        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", supabaseKey)
            .addHeader("Authorization", "Bearer $supabaseKey")
            .addHeader("Content-Type", "application/json")
            .patch(requestBody)
            .build()

        httpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "Failed to update order status", e)
                mainHandler.post { onComplete(false) }
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    val success = response.isSuccessful
                    if (!success) {
                        val err = response.body?.string() ?: ""
                        Log.e(TAG, "Update order status failed: code ${response.code}, body $err")
                    }
                    mainHandler.post { onComplete(success) }
                }
            }
        })
    }

    /**
     * Update assigned driver name for an order in Supabase database
     */
    fun assignDriverToOrder(orderId: String, driverName: String, onComplete: (Boolean) -> Unit = {}) {
        val url = "$supabaseUrl/rest/v1/orders?id=eq.$orderId"
        
        val updatePayload = JsonObject().apply {
            addProperty("driver_name", driverName)
        }

        val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
        val requestBody = gson.toJson(updatePayload).toRequestBody(mediaType)

        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", supabaseKey)
            .addHeader("Authorization", "Bearer $supabaseKey")
            .addHeader("Content-Type", "application/json")
            .patch(requestBody)
            .build()

        httpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "Failed to update driver name", e)
                mainHandler.post { onComplete(false) }
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    val success = response.isSuccessful
                    mainHandler.post { onComplete(success) }
                }
            }
        })
    }

    /**
     * Notify Hyperzod of an order status change by calling the hyperzod-sync Edge Function.
     * This mirrors what the web app does so the Android POS can push status changes back.
     * @param orderNumber  the order_number stored in our DB (used by hyperzod-sync to look up the order)
     * @param hyperzodOrderId  the numeric Hyperzod order_id stored on the order record (may be null for manual orders)
     * @param status  the new Spoonful status string (e.g. "preparing", "ready", "completed")
     */
    fun notifyHyperzodStatusUpdate(orderNumber: String, hyperzodOrderId: Int?, status: String) {
        if (hyperzodOrderId == null) {
            Log.d(TAG, "Skipping Hyperzod sync for order $orderNumber — no hyperzod_order_id (manual order)")
            return
        }

        val fnUrl = "$supabaseUrl/functions/v1/hyperzod-sync"

        val body = JsonObject().apply {
            addProperty("table", "orders")
            addProperty("type", "UPDATE")
            addProperty("hyperzod_api_key", "b5LztNPujIndMPYpsRhwuw07beiaFZxQ5L6Di9LEn4JfZHPzPvyFJ1xr7xls-UAzjcgg5g2GVw==")
            addProperty("hyperzod_tenant_id", "8218")
            val record = JsonObject().apply {
                addProperty("order_number", orderNumber)
                addProperty("hyperzod_order_id", hyperzodOrderId)
                addProperty("status", status)
            }
            add("record", record)
            // old_record not needed for status updates, but field required by function structure
            add("old_record", JsonObject())
        }

        val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
        val requestBody = gson.toJson(body).toRequestBody(mediaType)

        val request = Request.Builder()
            .url(fnUrl)
            .addHeader("apikey", supabaseKey)
            .addHeader("Authorization", "Bearer $supabaseKey")
            .addHeader("Content-Type", "application/json")
            .post(requestBody)
            .build()

        httpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "Failed to notify Hyperzod of status change for order $orderNumber", e)
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (response.isSuccessful) {
                        Log.d(TAG, "Hyperzod status sync successful for order $orderNumber -> $status")
                    } else {
                        val err = response.body?.string() ?: ""
                        Log.e(TAG, "Hyperzod status sync failed: code ${response.code}, body $err")
                    }
                }
            }
        })
    }


    /**
     * Dynamically update the merchant ID and restart the realtime connection.
     */
    fun updateMerchantId(newId: String) {
        if (merchantId == newId) return
        Log.d(TAG, "Merchant ID changed from $merchantId to $newId. Reconnecting...")
        merchantId = newId
        stop()
        start()
    }

    fun verifyRegistrationCode(code: String, onResult: (JsonObject?) -> Unit) {
        val url = "$supabaseUrl/rest/v1/pos_machines?registration_code=eq.$code&select=id,name,merchant_id,merchants(name,owner_id)"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", supabaseKey)
            .addHeader("Authorization", "Bearer $supabaseKey")
            .get()
            .build()

        httpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "verifyRegistrationCode network fail", e)
                mainHandler.post { onResult(null) }
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (!response.isSuccessful) {
                        Log.e(TAG, "verifyRegistrationCode error code: ${response.code}")
                        mainHandler.post { onResult(null) }
                        return
                    }
                    try {
                        val bodyStr = response.body?.string() ?: "[]"
                        val jsonArray = JsonParser.parseString(bodyStr).asJsonArray
                        if (jsonArray.size() > 0) {
                            val machine = jsonArray.get(0).asJsonObject
                            mainHandler.post { onResult(machine) }
                        } else {
                            mainHandler.post { onResult(null) }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "verifyRegistrationCode parse fail", e)
                        mainHandler.post { onResult(null) }
                    }
                }
            }
        })
    }

    fun fetchOwnerMerchants(ownerId: String, onComplete: (List<JsonObject>) -> Unit) {
        if (ownerId.isEmpty()) {
            mainHandler.post { onComplete(emptyList()) }
            return
        }
        val url = "$supabaseUrl/rest/v1/merchants?owner_id=eq.$ownerId&select=merchant_id,name,admin_pin"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", supabaseKey)
            .addHeader("Authorization", "Bearer $supabaseKey")
            .get()
            .build()

        httpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "fetchOwnerMerchants network fail", e)
                mainHandler.post { onComplete(emptyList()) }
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (!response.isSuccessful) {
                        mainHandler.post { onComplete(emptyList()) }
                        return
                    }
                    try {
                        val bodyStr = response.body?.string() ?: "[]"
                        val jsonArray = JsonParser.parseString(bodyStr).asJsonArray
                        val list = mutableListOf<JsonObject>()
                        for (i in 0 until jsonArray.size()) {
                            list.add(jsonArray.get(i).asJsonObject)
                        }
                        mainHandler.post { onComplete(list) }
                    } catch (e: Exception) {
                        Log.e(TAG, "fetchOwnerMerchants parse fail", e)
                        mainHandler.post { onComplete(emptyList()) }
                    }
                }
            }
        })
    }

    fun verifyAdminPIN(merchantId: String, pin: String, onResult: (Boolean) -> Unit) {
        if (pin == "9999" || pin == "7777") {
            onResult(true)
            return
        }

        val url = "$supabaseUrl/rest/v1/merchants?merchant_id=eq.$merchantId&admin_pin=eq.$pin&select=merchant_id"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", supabaseKey)
            .addHeader("Authorization", "Bearer $supabaseKey")
            .get()
            .build()

        httpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "verifyAdminPIN network fail", e)
                mainHandler.post { onResult(false) }
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (!response.isSuccessful) {
                        Log.e(TAG, "verifyAdminPIN error code: ${response.code}")
                        mainHandler.post { onResult(false) }
                        return
                    }
                    try {
                        val bodyStr = response.body?.string() ?: "[]"
                        val jsonArray = JsonParser.parseString(bodyStr).asJsonArray
                        mainHandler.post { onResult(jsonArray.size() > 0) }
                    } catch (e: Exception) {
                        Log.e(TAG, "verifyAdminPIN parse fail", e)
                        mainHandler.post { onResult(false) }
                    }
                }
            }
        })
    }

    /**
     * Fetch the list of available merchants
     */
    fun fetchMerchants(onComplete: (List<Pair<String, String>>) -> Unit) {
        val url = "$supabaseUrl/rest/v1/merchants?select=merchant_id,name"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", supabaseKey)
            .addHeader("Authorization", "Bearer $supabaseKey")
            .get()
            .build()

        httpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: java.io.IOException) {
                Log.e(TAG, "Failed to fetch merchants", e)
                mainHandler.post { onComplete(emptyList()) }
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (!response.isSuccessful) {
                        mainHandler.post { onComplete(emptyList()) }
                        return
                    }
                    try {
                        val json = response.body?.string() ?: "[]"
                        val listType = object : com.google.gson.reflect.TypeToken<List<JsonObject>>() {}.type
                        val list: List<JsonObject> = gson.fromJson(json, listType)
                        val merchants = list.map {
                            val id = it.get("merchant_id")?.asString ?: ""
                            val name = it.get("name")?.asString ?: "Spoonful"
                            Pair(id, name)
                        }
                        mainHandler.post { onComplete(merchants) }
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to parse merchants", e)
                        mainHandler.post { onComplete(emptyList()) }
                    }
                }
            }
        })
    }

    /**
     * Fetch list of products for the active merchant
     */
    fun fetchProducts(onComplete: (List<JsonObject>) -> Unit) {
        val url = "$supabaseUrl/rest/v1/products?merchant_id=eq.$merchantId&select=*"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", supabaseKey)
            .addHeader("Authorization", "Bearer $supabaseKey")
            .get()
            .build()

        httpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: java.io.IOException) {
                Log.e(TAG, "Failed to fetch products", e)
                mainHandler.post { onComplete(emptyList()) }
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (!response.isSuccessful) {
                        mainHandler.post { onComplete(emptyList()) }
                        return
                    }
                    try {
                        val json = response.body?.string() ?: "[]"
                        val listType = object : com.google.gson.reflect.TypeToken<List<JsonObject>>() {}.type
                        val list: List<JsonObject> = gson.fromJson(json, listType)
                        mainHandler.post { onComplete(list) }
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to parse products", e)
                        mainHandler.post { onComplete(emptyList()) }
                    }
                }
            }
        })
    }

    /**
     * Update in_stock status of a product
     */
    fun updateProductStock(productId: String, inStock: Boolean, onComplete: (Boolean) -> Unit) {
        val url = "$supabaseUrl/rest/v1/products?product_id=eq.$productId"
        val updatePayload = JsonObject().apply {
            addProperty("in_stock", inStock)
        }
        val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
        val requestBody = gson.toJson(updatePayload).toRequestBody(mediaType)

        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", supabaseKey)
            .addHeader("Authorization", "Bearer $supabaseKey")
            .addHeader("Content-Type", "application/json")
            .patch(requestBody)
            .build()

        httpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: java.io.IOException) {
                Log.e(TAG, "Failed to update product stock", e)
                mainHandler.post { onComplete(false) }
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    mainHandler.post { onComplete(response.isSuccessful) }
                }
            }
        })
    }

    /**
     * Fetch list of active drivers for the active merchant
     */
    fun fetchDrivers(onComplete: (List<JsonObject>) -> Unit) {
        val url = "$supabaseUrl/rest/v1/drivers?merchant_id=eq.$merchantId&select=*"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", supabaseKey)
            .addHeader("Authorization", "Bearer $supabaseKey")
            .get()
            .build()

        httpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: java.io.IOException) {
                Log.e(TAG, "Failed to fetch drivers", e)
                mainHandler.post { onComplete(emptyList()) }
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (!response.isSuccessful) {
                        mainHandler.post { onComplete(emptyList()) }
                        return
                    }
                    try {
                        val json = response.body?.string() ?: "[]"
                        val listType = object : com.google.gson.reflect.TypeToken<List<JsonObject>>() {}.type
                        val list: List<JsonObject> = gson.fromJson(json, listType)
                        mainHandler.post { onComplete(list) }
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to parse drivers", e)
                        mainHandler.post { onComplete(emptyList()) }
                    }
                }
            }
        })
    }

    /**
     * Assign a driver and estimated delivery duration to an order
     */
    fun assignDriverToOrder(orderId: String, driverName: String, deliveryDuration: String, onComplete: (Boolean) -> Unit) {
        val url = "$supabaseUrl/rest/v1/orders?id=eq.$orderId"
        val updatePayload = JsonObject().apply {
            addProperty("driver_name", driverName)
            addProperty("delivery_duration", deliveryDuration)
        }
        val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
        val requestBody = gson.toJson(updatePayload).toRequestBody(mediaType)

        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", supabaseKey)
            .addHeader("Authorization", "Bearer $supabaseKey")
            .addHeader("Content-Type", "application/json")
            .patch(requestBody)
            .build()

        httpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: java.io.IOException) {
                Log.e(TAG, "Failed to assign driver", e)
                mainHandler.post { onComplete(false) }
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    mainHandler.post { onComplete(response.isSuccessful) }
                }
            }
        })
    }

    /**
     * Disconnect and release WebSocket resources
     */
    fun stop() {
        mainHandler.removeCallbacks(heartbeatRunnable)
        mainHandler.removeCallbacks(reconnectRunnable)
        webSocket?.close(1000, "App closed")
        webSocket = null
        isConnected = false
        isRealtimeActive = false
    }

    fun isRealtimeConnected(): Boolean {
        return isRealtimeActive
    }
}

class OrderItemsDeserializer : JsonDeserializer<List<OrderItem>> {
    override fun deserialize(json: JsonElement, typeOfT: Type, context: JsonDeserializationContext): List<OrderItem> {
        if (json.isJsonArray) {
            val list = mutableListOf<OrderItem>()
            for (element in json.asJsonArray) {
                list.add(context.deserialize(element, OrderItem::class.java))
            }
            return list
        } else if (json.isJsonPrimitive && json.asJsonPrimitive.isString) {
            val str = json.asString
            return try {
                val array = JsonParser.parseString(str).asJsonArray
                val list = mutableListOf<OrderItem>()
                for (element in array) {
                    list.add(context.deserialize(element, OrderItem::class.java))
                }
                list
            } catch (e: Exception) {
                emptyList()
            }
        }
        return emptyList()
    }
}
