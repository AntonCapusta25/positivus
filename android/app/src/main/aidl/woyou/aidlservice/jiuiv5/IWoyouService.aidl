package woyou.aidlservice.jiuiv5;

import woyou.aidlservice.jiuiv5.ICallback;
import android.graphics.Bitmap;

interface IWoyouService {

    /**
     * TRANSACTION +0 (must stay first - system only)
     * Replaces updateFirmware(); system use only.
     */
    boolean postPrintData(String packageName, in byte[] data, int offset, int length);

    /**
     * TRANSACTION +1
     * Printer firmware status: 0=unknown, A5=bootloader, C3=print
     */
    int getFirmwareStatus();

    /**
     * TRANSACTION +2
     * Get the WoyouService service version string
     */
    String getServiceVersion();

    /**
     * TRANSACTION +3
     * Initialize the printer (resets logic, does NOT clear buffer)
     */
    void printerInit(in ICallback callback);

    /**
     * TRANSACTION +4
     * Printer self-checking — prints the hardware self-test page
     */
    void printerSelfChecking(in ICallback callback);

    /**
     * TRANSACTION +5
     * Get the printer board serial number
     */
    String getPrinterSerialNo();

    /**
     * TRANSACTION +6
     * Get the printer firmware version
     */
    String getPrinterVersion();

    /**
     * TRANSACTION +7
     * Get the printer model/modal string
     */
    String getPrinterModal();

    /**
     * TRANSACTION +8
     * Get total paper length printed since power-on (returned via onReturnString callback)
     */
    void getPrintedLength(in ICallback callback);

    /**
     * TRANSACTION +9
     * Feed n lines of paper
     */
    void lineWrap(int n, in ICallback callback);

    /**
     * TRANSACTION +10
     * Send raw ESC/POS commands directly
     */
    void sendRAWData(in byte[] data, in ICallback callback);

    /**
     * TRANSACTION +11
     * Set alignment: 0=Left, 1=Center, 2=Right
     */
    void setAlignment(int alignment, in ICallback callback);

    /**
     * TRANSACTION +12
     * Set font name (system-only; external calls have no effect)
     */
    void setFontName(String typeface, in ICallback callback);

    /**
     * TRANSACTION +13
     * Set font size (affects subsequent print calls until re-init)
     */
    void setFontSize(float fontSize, in ICallback callback);

    /**
     * TRANSACTION +14
     * Print text — auto word-wraps at line width; won't print partial lines
     */
    void printText(String text, in ICallback callback);

    /**
     * TRANSACTION +15
     * Print text with a specific font (typeface has no effect for external apps)
     */
    void printTextWithFont(String text, String typeface, float fontSize, in ICallback callback);

    /**
     * TRANSACTION +16
     * Print a table row with column widths and per-column alignment
     */
    void printColumnsText(in String[] colsTextArr, in int[] colsWidthArr, in int[] colsAlign, in ICallback callback);

    /**
     * TRANSACTION +17
     * Print a bitmap image
     */
    void printBitmap(in Bitmap bitmap, in ICallback callback);

    /**
     * TRANSACTION +18
     * Print a 1D barcode
     * symbology: 0=UPC-A, 1=UPC-E, 2=JAN13(EAN), 3=JAN8(EAN), 4=CODE39, 5=ITF, 6=CODABAR, 7=CODE93, 8=CODE128
     * textPosition: 0=none, 1=above, 2=below, 3=both
     */
    void printBarCode(String data, int symbology, int height, int width, int textPosition, in ICallback callback);

    /**
     * TRANSACTION +19
     * Print a QR code
     * moduleSize: 1-16
     * errorCorrectionLevel: 0=L, 1=M, 2=Q, 3=H
     */
    void printQRCode(String data, int moduleSize, int errorCorrectionLevel, in ICallback callback);

    /**
     * TRANSACTION +20
     * Print text in original (double-byte ESC/POS) mode
     */
    void printOriginalText(String text, in ICallback callback);

    /**
     * TRANSACTION +21
     * Commit a print job — all prior commands are printed as one atomic job
     */
    void commitPrinterBuffer();

    /**
     * TRANSACTION +22
     * Enter print transaction buffer mode
     */
    void enterPrinterBuffer(boolean clean);

    /**
     * TRANSACTION +23
     * Exit print transaction buffer mode
     */
    void exitPrinterBuffer(boolean commit);

    /**
     * TRANSACTION +24
     * Set bold printing: 0=normal, 1=bold
     */
    void setFontBold(boolean isBold);

    /**
     * TRANSACTION +25
     * Get printer status: 1=Normal, 2=Out of paper, 3=Overheat, 4=Other exception
     */
    int getPrinterStatus();
}
