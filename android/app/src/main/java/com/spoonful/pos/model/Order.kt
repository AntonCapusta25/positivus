package com.spoonful.pos.model

import com.google.gson.annotations.SerializedName

data class Order(
    @SerializedName("id") val id: String,
    @SerializedName("order_number") val orderNumber: String,
    @SerializedName("hyperzod_order_id") val hyperzodOrderId: Int? = null,
    @SerializedName("customer_name") val customerName: String?,
    @SerializedName("customer_phone") val customerPhone: String?,
    @SerializedName("items") val items: List<OrderItem>,
    @SerializedName("subtotal") val subtotal: Double,
    @SerializedName("tax") val tax: Double,
    @SerializedName("delivery_fee") val deliveryFee: Double,
    @SerializedName("discount") val discount: Double,
    @SerializedName("total") val total: Double,
    @SerializedName("status") var status: String, // incoming, preparing, ready, completed, cancelled
    @SerializedName("type") val type: String, // delivery, pickup, dine_in
    @SerializedName("payment_method") val paymentMethod: String, // cash, card, online
    @SerializedName("payment_status") val paymentStatus: String, // pending, paid, refunded
    @SerializedName("notes") val notes: String?,
    @SerializedName("printed") var printed: Boolean,
    @SerializedName("print_requested_at") var printRequestedAt: String? = null,
    @SerializedName("merchant_id") val merchantId: String? = null,
    @SerializedName("customer_address") val customerAddress: String? = null,
    @SerializedName("driver_name") var driverName: String? = null,
    @SerializedName("customer_order_count") val customerOrderCount: Int? = 1,
    @SerializedName("created_at") val createdAt: String
)


data class OrderItem(
    @SerializedName("name") val name: String,
    @SerializedName("quantity") val quantity: Int,
    @SerializedName("price") val price: Double,
    @SerializedName("notes") val notes: String?
)
