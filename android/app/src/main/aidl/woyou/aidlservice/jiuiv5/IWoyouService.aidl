package woyou.aidlservice.jiuiv5;

import woyou.aidlservice.jiuiv5.ICallback;
import android.graphics.Bitmap;

interface IWoyouService {
    /**
     * Initialize the printer
     */
    void printerInit(in ICallback callback);
    
    /**
     * Printer self-checking
     */
    void printerSelfChecking(in ICallback callback);
    
    /**
     * Get printer serial number
     */
    String getPrinterSerialNo();
    
    /**
     * Get printer version/model
     */
    String getPrinterVersion();
    
    /**
     * Print text
     */
    void printText(String text, in ICallback callback);
    
    /**
     * Print text with custom typeface and size
     */
    void printTextWithFont(String text, String typeface, float fontSize, in ICallback callback);
    
    /**
     * Set alignment: 0=Left, 1=Center, 2=Right
     */
    void setAlignment(int alignment, in ICallback callback);
    
    /**
     * Set font size
     */
    void setFontSize(float fontSize, in ICallback callback);
    
    /**
     * Feed paper by lines
     */
    void lineWrap(int n, in ICallback callback);
    
    /**
     * Print bitmap image
     */
    void printBitmap(in Bitmap bitmap, in ICallback callback);
    
    /**
     * Print barcode
     */
    void printBarCode(String data, int symbology, int height, int width, int textposition, in ICallback callback);
    
    /**
     * Print QR code
     */
    void printQRCode(String data, int modulesize, int errorcorrectionlevel, in ICallback callback);
    
    /**
     * Send ESC/POS raw commands
     */
    void sendRAWData(in byte[] data, in ICallback callback);
    
    /**
     * Get printer status: 1 = Normal, 2 = Preparing/Out of paper, 3 = Overheat, 4 = Other Exception
     */
    int getPrinterStatus();
}
