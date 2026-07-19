/*
 * This file is auto-generated.  DO NOT MODIFY.
 */
package woyou.aidlservice.jiuiv5;
public interface IWoyouService extends android.os.IInterface
{
  /** Default implementation for IWoyouService. */
  public static class Default implements woyou.aidlservice.jiuiv5.IWoyouService
  {
    /**
     * TRANSACTION +0 (must stay first - system only)
     * Replaces updateFirmware(); system use only.
     */
    @Override public boolean postPrintData(java.lang.String packageName, byte[] data, int offset, int length) throws android.os.RemoteException
    {
      return false;
    }
    /**
     * TRANSACTION +1
     * Printer firmware status: 0=unknown, A5=bootloader, C3=print
     */
    @Override public int getFirmwareStatus() throws android.os.RemoteException
    {
      return 0;
    }
    /**
     * TRANSACTION +2
     * Get the WoyouService service version string
     */
    @Override public java.lang.String getServiceVersion() throws android.os.RemoteException
    {
      return null;
    }
    /**
     * TRANSACTION +3
     * Initialize the printer (resets logic, does NOT clear buffer)
     */
    @Override public void printerInit(woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +4
     * Printer self-checking — prints the hardware self-test page
     */
    @Override public void printerSelfChecking(woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +5
     * Get the printer board serial number
     */
    @Override public java.lang.String getPrinterSerialNo() throws android.os.RemoteException
    {
      return null;
    }
    /**
     * TRANSACTION +6
     * Get the printer firmware version
     */
    @Override public java.lang.String getPrinterVersion() throws android.os.RemoteException
    {
      return null;
    }
    /**
     * TRANSACTION +7
     * Get the printer model/modal string
     */
    @Override public java.lang.String getPrinterModal() throws android.os.RemoteException
    {
      return null;
    }
    /**
     * TRANSACTION +8
     * Get total paper length printed since power-on (returned via onReturnString callback)
     */
    @Override public void getPrintedLength(woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +9
     * Feed n lines of paper
     */
    @Override public void lineWrap(int n, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +10
     * Send raw ESC/POS commands directly
     */
    @Override public void sendRAWData(byte[] data, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +11
     * Set alignment: 0=Left, 1=Center, 2=Right
     */
    @Override public void setAlignment(int alignment, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +12
     * Set font name (system-only; external calls have no effect)
     */
    @Override public void setFontName(java.lang.String typeface, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +13
     * Set font size (affects subsequent print calls until re-init)
     */
    @Override public void setFontSize(float fontSize, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +14
     * Print text — auto word-wraps at line width; won't print partial lines
     */
    @Override public void printText(java.lang.String text, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +15
     * Print text with a specific font (typeface has no effect for external apps)
     */
    @Override public void printTextWithFont(java.lang.String text, java.lang.String typeface, float fontSize, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +16
     * Print a table row with column widths and per-column alignment
     */
    @Override public void printColumnsText(java.lang.String[] colsTextArr, int[] colsWidthArr, int[] colsAlign, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +17
     * Print a bitmap image
     */
    @Override public void printBitmap(android.graphics.Bitmap bitmap, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +18
     * Print a 1D barcode
     * symbology: 0=UPC-A, 1=UPC-E, 2=JAN13(EAN), 3=JAN8(EAN), 4=CODE39, 5=ITF, 6=CODABAR, 7=CODE93, 8=CODE128
     * textPosition: 0=none, 1=above, 2=below, 3=both
     */
    @Override public void printBarCode(java.lang.String data, int symbology, int height, int width, int textPosition, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +19
     * Print a QR code
     * moduleSize: 1-16
     * errorCorrectionLevel: 0=L, 1=M, 2=Q, 3=H
     */
    @Override public void printQRCode(java.lang.String data, int moduleSize, int errorCorrectionLevel, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +20
     * Print text in original (double-byte ESC/POS) mode
     */
    @Override public void printOriginalText(java.lang.String text, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +21
     * Commit a print job — all prior commands are printed as one atomic job
     */
    @Override public void commitPrinterBuffer() throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +22
     * Enter print transaction buffer mode
     */
    @Override public void enterPrinterBuffer(boolean clean) throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +23
     * Exit print transaction buffer mode
     */
    @Override public void exitPrinterBuffer(boolean commit) throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +24
     * Set bold printing: 0=normal, 1=bold
     */
    @Override public void setFontBold(boolean isBold) throws android.os.RemoteException
    {
    }
    /**
     * TRANSACTION +25
     * Get printer status: 1=Normal, 2=Out of paper, 3=Overheat, 4=Other exception
     */
    @Override public int getPrinterStatus() throws android.os.RemoteException
    {
      return 0;
    }
    @Override
    public android.os.IBinder asBinder() {
      return null;
    }
  }
  /** Local-side IPC implementation stub class. */
  public static abstract class Stub extends android.os.Binder implements woyou.aidlservice.jiuiv5.IWoyouService
  {
    /** Construct the stub at attach it to the interface. */
    public Stub()
    {
      this.attachInterface(this, DESCRIPTOR);
    }
    /**
     * Cast an IBinder object into an woyou.aidlservice.jiuiv5.IWoyouService interface,
     * generating a proxy if needed.
     */
    public static woyou.aidlservice.jiuiv5.IWoyouService asInterface(android.os.IBinder obj)
    {
      if ((obj==null)) {
        return null;
      }
      android.os.IInterface iin = obj.queryLocalInterface(DESCRIPTOR);
      if (((iin!=null)&&(iin instanceof woyou.aidlservice.jiuiv5.IWoyouService))) {
        return ((woyou.aidlservice.jiuiv5.IWoyouService)iin);
      }
      return new woyou.aidlservice.jiuiv5.IWoyouService.Stub.Proxy(obj);
    }
    @Override public android.os.IBinder asBinder()
    {
      return this;
    }
    @Override public boolean onTransact(int code, android.os.Parcel data, android.os.Parcel reply, int flags) throws android.os.RemoteException
    {
      java.lang.String descriptor = DESCRIPTOR;
      if (code >= android.os.IBinder.FIRST_CALL_TRANSACTION && code <= android.os.IBinder.LAST_CALL_TRANSACTION) {
        data.enforceInterface(descriptor);
      }
      switch (code)
      {
        case INTERFACE_TRANSACTION:
        {
          reply.writeString(descriptor);
          return true;
        }
      }
      switch (code)
      {
        case TRANSACTION_postPrintData:
        {
          java.lang.String _arg0;
          _arg0 = data.readString();
          byte[] _arg1;
          _arg1 = data.createByteArray();
          int _arg2;
          _arg2 = data.readInt();
          int _arg3;
          _arg3 = data.readInt();
          boolean _result = this.postPrintData(_arg0, _arg1, _arg2, _arg3);
          reply.writeNoException();
          reply.writeInt(((_result)?(1):(0)));
          break;
        }
        case TRANSACTION_getFirmwareStatus:
        {
          int _result = this.getFirmwareStatus();
          reply.writeNoException();
          reply.writeInt(_result);
          break;
        }
        case TRANSACTION_getServiceVersion:
        {
          java.lang.String _result = this.getServiceVersion();
          reply.writeNoException();
          reply.writeString(_result);
          break;
        }
        case TRANSACTION_printerInit:
        {
          woyou.aidlservice.jiuiv5.ICallback _arg0;
          _arg0 = woyou.aidlservice.jiuiv5.ICallback.Stub.asInterface(data.readStrongBinder());
          this.printerInit(_arg0);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_printerSelfChecking:
        {
          woyou.aidlservice.jiuiv5.ICallback _arg0;
          _arg0 = woyou.aidlservice.jiuiv5.ICallback.Stub.asInterface(data.readStrongBinder());
          this.printerSelfChecking(_arg0);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_getPrinterSerialNo:
        {
          java.lang.String _result = this.getPrinterSerialNo();
          reply.writeNoException();
          reply.writeString(_result);
          break;
        }
        case TRANSACTION_getPrinterVersion:
        {
          java.lang.String _result = this.getPrinterVersion();
          reply.writeNoException();
          reply.writeString(_result);
          break;
        }
        case TRANSACTION_getPrinterModal:
        {
          java.lang.String _result = this.getPrinterModal();
          reply.writeNoException();
          reply.writeString(_result);
          break;
        }
        case TRANSACTION_getPrintedLength:
        {
          woyou.aidlservice.jiuiv5.ICallback _arg0;
          _arg0 = woyou.aidlservice.jiuiv5.ICallback.Stub.asInterface(data.readStrongBinder());
          this.getPrintedLength(_arg0);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_lineWrap:
        {
          int _arg0;
          _arg0 = data.readInt();
          woyou.aidlservice.jiuiv5.ICallback _arg1;
          _arg1 = woyou.aidlservice.jiuiv5.ICallback.Stub.asInterface(data.readStrongBinder());
          this.lineWrap(_arg0, _arg1);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_sendRAWData:
        {
          byte[] _arg0;
          _arg0 = data.createByteArray();
          woyou.aidlservice.jiuiv5.ICallback _arg1;
          _arg1 = woyou.aidlservice.jiuiv5.ICallback.Stub.asInterface(data.readStrongBinder());
          this.sendRAWData(_arg0, _arg1);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_setAlignment:
        {
          int _arg0;
          _arg0 = data.readInt();
          woyou.aidlservice.jiuiv5.ICallback _arg1;
          _arg1 = woyou.aidlservice.jiuiv5.ICallback.Stub.asInterface(data.readStrongBinder());
          this.setAlignment(_arg0, _arg1);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_setFontName:
        {
          java.lang.String _arg0;
          _arg0 = data.readString();
          woyou.aidlservice.jiuiv5.ICallback _arg1;
          _arg1 = woyou.aidlservice.jiuiv5.ICallback.Stub.asInterface(data.readStrongBinder());
          this.setFontName(_arg0, _arg1);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_setFontSize:
        {
          float _arg0;
          _arg0 = data.readFloat();
          woyou.aidlservice.jiuiv5.ICallback _arg1;
          _arg1 = woyou.aidlservice.jiuiv5.ICallback.Stub.asInterface(data.readStrongBinder());
          this.setFontSize(_arg0, _arg1);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_printText:
        {
          java.lang.String _arg0;
          _arg0 = data.readString();
          woyou.aidlservice.jiuiv5.ICallback _arg1;
          _arg1 = woyou.aidlservice.jiuiv5.ICallback.Stub.asInterface(data.readStrongBinder());
          this.printText(_arg0, _arg1);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_printTextWithFont:
        {
          java.lang.String _arg0;
          _arg0 = data.readString();
          java.lang.String _arg1;
          _arg1 = data.readString();
          float _arg2;
          _arg2 = data.readFloat();
          woyou.aidlservice.jiuiv5.ICallback _arg3;
          _arg3 = woyou.aidlservice.jiuiv5.ICallback.Stub.asInterface(data.readStrongBinder());
          this.printTextWithFont(_arg0, _arg1, _arg2, _arg3);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_printColumnsText:
        {
          java.lang.String[] _arg0;
          _arg0 = data.createStringArray();
          int[] _arg1;
          _arg1 = data.createIntArray();
          int[] _arg2;
          _arg2 = data.createIntArray();
          woyou.aidlservice.jiuiv5.ICallback _arg3;
          _arg3 = woyou.aidlservice.jiuiv5.ICallback.Stub.asInterface(data.readStrongBinder());
          this.printColumnsText(_arg0, _arg1, _arg2, _arg3);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_printBitmap:
        {
          android.graphics.Bitmap _arg0;
          _arg0 = _Parcel.readTypedObject(data, android.graphics.Bitmap.CREATOR);
          woyou.aidlservice.jiuiv5.ICallback _arg1;
          _arg1 = woyou.aidlservice.jiuiv5.ICallback.Stub.asInterface(data.readStrongBinder());
          this.printBitmap(_arg0, _arg1);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_printBarCode:
        {
          java.lang.String _arg0;
          _arg0 = data.readString();
          int _arg1;
          _arg1 = data.readInt();
          int _arg2;
          _arg2 = data.readInt();
          int _arg3;
          _arg3 = data.readInt();
          int _arg4;
          _arg4 = data.readInt();
          woyou.aidlservice.jiuiv5.ICallback _arg5;
          _arg5 = woyou.aidlservice.jiuiv5.ICallback.Stub.asInterface(data.readStrongBinder());
          this.printBarCode(_arg0, _arg1, _arg2, _arg3, _arg4, _arg5);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_printQRCode:
        {
          java.lang.String _arg0;
          _arg0 = data.readString();
          int _arg1;
          _arg1 = data.readInt();
          int _arg2;
          _arg2 = data.readInt();
          woyou.aidlservice.jiuiv5.ICallback _arg3;
          _arg3 = woyou.aidlservice.jiuiv5.ICallback.Stub.asInterface(data.readStrongBinder());
          this.printQRCode(_arg0, _arg1, _arg2, _arg3);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_printOriginalText:
        {
          java.lang.String _arg0;
          _arg0 = data.readString();
          woyou.aidlservice.jiuiv5.ICallback _arg1;
          _arg1 = woyou.aidlservice.jiuiv5.ICallback.Stub.asInterface(data.readStrongBinder());
          this.printOriginalText(_arg0, _arg1);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_commitPrinterBuffer:
        {
          this.commitPrinterBuffer();
          reply.writeNoException();
          break;
        }
        case TRANSACTION_enterPrinterBuffer:
        {
          boolean _arg0;
          _arg0 = (0!=data.readInt());
          this.enterPrinterBuffer(_arg0);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_exitPrinterBuffer:
        {
          boolean _arg0;
          _arg0 = (0!=data.readInt());
          this.exitPrinterBuffer(_arg0);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_setFontBold:
        {
          boolean _arg0;
          _arg0 = (0!=data.readInt());
          this.setFontBold(_arg0);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_getPrinterStatus:
        {
          int _result = this.getPrinterStatus();
          reply.writeNoException();
          reply.writeInt(_result);
          break;
        }
        default:
        {
          return super.onTransact(code, data, reply, flags);
        }
      }
      return true;
    }
    private static class Proxy implements woyou.aidlservice.jiuiv5.IWoyouService
    {
      private android.os.IBinder mRemote;
      Proxy(android.os.IBinder remote)
      {
        mRemote = remote;
      }
      @Override public android.os.IBinder asBinder()
      {
        return mRemote;
      }
      public java.lang.String getInterfaceDescriptor()
      {
        return DESCRIPTOR;
      }
      /**
       * TRANSACTION +0 (must stay first - system only)
       * Replaces updateFirmware(); system use only.
       */
      @Override public boolean postPrintData(java.lang.String packageName, byte[] data, int offset, int length) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        boolean _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeString(packageName);
          _data.writeByteArray(data);
          _data.writeInt(offset);
          _data.writeInt(length);
          boolean _status = mRemote.transact(Stub.TRANSACTION_postPrintData, _data, _reply, 0);
          _reply.readException();
          _result = (0!=_reply.readInt());
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      /**
       * TRANSACTION +1
       * Printer firmware status: 0=unknown, A5=bootloader, C3=print
       */
      @Override public int getFirmwareStatus() throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        int _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          boolean _status = mRemote.transact(Stub.TRANSACTION_getFirmwareStatus, _data, _reply, 0);
          _reply.readException();
          _result = _reply.readInt();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      /**
       * TRANSACTION +2
       * Get the WoyouService service version string
       */
      @Override public java.lang.String getServiceVersion() throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        java.lang.String _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          boolean _status = mRemote.transact(Stub.TRANSACTION_getServiceVersion, _data, _reply, 0);
          _reply.readException();
          _result = _reply.readString();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      /**
       * TRANSACTION +3
       * Initialize the printer (resets logic, does NOT clear buffer)
       */
      @Override public void printerInit(woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeStrongInterface(callback);
          boolean _status = mRemote.transact(Stub.TRANSACTION_printerInit, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +4
       * Printer self-checking — prints the hardware self-test page
       */
      @Override public void printerSelfChecking(woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeStrongInterface(callback);
          boolean _status = mRemote.transact(Stub.TRANSACTION_printerSelfChecking, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +5
       * Get the printer board serial number
       */
      @Override public java.lang.String getPrinterSerialNo() throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        java.lang.String _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          boolean _status = mRemote.transact(Stub.TRANSACTION_getPrinterSerialNo, _data, _reply, 0);
          _reply.readException();
          _result = _reply.readString();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      /**
       * TRANSACTION +6
       * Get the printer firmware version
       */
      @Override public java.lang.String getPrinterVersion() throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        java.lang.String _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          boolean _status = mRemote.transact(Stub.TRANSACTION_getPrinterVersion, _data, _reply, 0);
          _reply.readException();
          _result = _reply.readString();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      /**
       * TRANSACTION +7
       * Get the printer model/modal string
       */
      @Override public java.lang.String getPrinterModal() throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        java.lang.String _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          boolean _status = mRemote.transact(Stub.TRANSACTION_getPrinterModal, _data, _reply, 0);
          _reply.readException();
          _result = _reply.readString();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      /**
       * TRANSACTION +8
       * Get total paper length printed since power-on (returned via onReturnString callback)
       */
      @Override public void getPrintedLength(woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeStrongInterface(callback);
          boolean _status = mRemote.transact(Stub.TRANSACTION_getPrintedLength, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +9
       * Feed n lines of paper
       */
      @Override public void lineWrap(int n, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeInt(n);
          _data.writeStrongInterface(callback);
          boolean _status = mRemote.transact(Stub.TRANSACTION_lineWrap, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +10
       * Send raw ESC/POS commands directly
       */
      @Override public void sendRAWData(byte[] data, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeByteArray(data);
          _data.writeStrongInterface(callback);
          boolean _status = mRemote.transact(Stub.TRANSACTION_sendRAWData, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +11
       * Set alignment: 0=Left, 1=Center, 2=Right
       */
      @Override public void setAlignment(int alignment, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeInt(alignment);
          _data.writeStrongInterface(callback);
          boolean _status = mRemote.transact(Stub.TRANSACTION_setAlignment, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +12
       * Set font name (system-only; external calls have no effect)
       */
      @Override public void setFontName(java.lang.String typeface, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeString(typeface);
          _data.writeStrongInterface(callback);
          boolean _status = mRemote.transact(Stub.TRANSACTION_setFontName, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +13
       * Set font size (affects subsequent print calls until re-init)
       */
      @Override public void setFontSize(float fontSize, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeFloat(fontSize);
          _data.writeStrongInterface(callback);
          boolean _status = mRemote.transact(Stub.TRANSACTION_setFontSize, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +14
       * Print text — auto word-wraps at line width; won't print partial lines
       */
      @Override public void printText(java.lang.String text, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeString(text);
          _data.writeStrongInterface(callback);
          boolean _status = mRemote.transact(Stub.TRANSACTION_printText, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +15
       * Print text with a specific font (typeface has no effect for external apps)
       */
      @Override public void printTextWithFont(java.lang.String text, java.lang.String typeface, float fontSize, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeString(text);
          _data.writeString(typeface);
          _data.writeFloat(fontSize);
          _data.writeStrongInterface(callback);
          boolean _status = mRemote.transact(Stub.TRANSACTION_printTextWithFont, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +16
       * Print a table row with column widths and per-column alignment
       */
      @Override public void printColumnsText(java.lang.String[] colsTextArr, int[] colsWidthArr, int[] colsAlign, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeStringArray(colsTextArr);
          _data.writeIntArray(colsWidthArr);
          _data.writeIntArray(colsAlign);
          _data.writeStrongInterface(callback);
          boolean _status = mRemote.transact(Stub.TRANSACTION_printColumnsText, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +17
       * Print a bitmap image
       */
      @Override public void printBitmap(android.graphics.Bitmap bitmap, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _Parcel.writeTypedObject(_data, bitmap, 0);
          _data.writeStrongInterface(callback);
          boolean _status = mRemote.transact(Stub.TRANSACTION_printBitmap, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +18
       * Print a 1D barcode
       * symbology: 0=UPC-A, 1=UPC-E, 2=JAN13(EAN), 3=JAN8(EAN), 4=CODE39, 5=ITF, 6=CODABAR, 7=CODE93, 8=CODE128
       * textPosition: 0=none, 1=above, 2=below, 3=both
       */
      @Override public void printBarCode(java.lang.String data, int symbology, int height, int width, int textPosition, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeString(data);
          _data.writeInt(symbology);
          _data.writeInt(height);
          _data.writeInt(width);
          _data.writeInt(textPosition);
          _data.writeStrongInterface(callback);
          boolean _status = mRemote.transact(Stub.TRANSACTION_printBarCode, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +19
       * Print a QR code
       * moduleSize: 1-16
       * errorCorrectionLevel: 0=L, 1=M, 2=Q, 3=H
       */
      @Override public void printQRCode(java.lang.String data, int moduleSize, int errorCorrectionLevel, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeString(data);
          _data.writeInt(moduleSize);
          _data.writeInt(errorCorrectionLevel);
          _data.writeStrongInterface(callback);
          boolean _status = mRemote.transact(Stub.TRANSACTION_printQRCode, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +20
       * Print text in original (double-byte ESC/POS) mode
       */
      @Override public void printOriginalText(java.lang.String text, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeString(text);
          _data.writeStrongInterface(callback);
          boolean _status = mRemote.transact(Stub.TRANSACTION_printOriginalText, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +21
       * Commit a print job — all prior commands are printed as one atomic job
       */
      @Override public void commitPrinterBuffer() throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          boolean _status = mRemote.transact(Stub.TRANSACTION_commitPrinterBuffer, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +22
       * Enter print transaction buffer mode
       */
      @Override public void enterPrinterBuffer(boolean clean) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeInt(((clean)?(1):(0)));
          boolean _status = mRemote.transact(Stub.TRANSACTION_enterPrinterBuffer, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +23
       * Exit print transaction buffer mode
       */
      @Override public void exitPrinterBuffer(boolean commit) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeInt(((commit)?(1):(0)));
          boolean _status = mRemote.transact(Stub.TRANSACTION_exitPrinterBuffer, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +24
       * Set bold printing: 0=normal, 1=bold
       */
      @Override public void setFontBold(boolean isBold) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeInt(((isBold)?(1):(0)));
          boolean _status = mRemote.transact(Stub.TRANSACTION_setFontBold, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      /**
       * TRANSACTION +25
       * Get printer status: 1=Normal, 2=Out of paper, 3=Overheat, 4=Other exception
       */
      @Override public int getPrinterStatus() throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        int _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          boolean _status = mRemote.transact(Stub.TRANSACTION_getPrinterStatus, _data, _reply, 0);
          _reply.readException();
          _result = _reply.readInt();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
    }
    static final int TRANSACTION_postPrintData = (android.os.IBinder.FIRST_CALL_TRANSACTION + 0);
    static final int TRANSACTION_getFirmwareStatus = (android.os.IBinder.FIRST_CALL_TRANSACTION + 1);
    static final int TRANSACTION_getServiceVersion = (android.os.IBinder.FIRST_CALL_TRANSACTION + 2);
    static final int TRANSACTION_printerInit = (android.os.IBinder.FIRST_CALL_TRANSACTION + 3);
    static final int TRANSACTION_printerSelfChecking = (android.os.IBinder.FIRST_CALL_TRANSACTION + 4);
    static final int TRANSACTION_getPrinterSerialNo = (android.os.IBinder.FIRST_CALL_TRANSACTION + 5);
    static final int TRANSACTION_getPrinterVersion = (android.os.IBinder.FIRST_CALL_TRANSACTION + 6);
    static final int TRANSACTION_getPrinterModal = (android.os.IBinder.FIRST_CALL_TRANSACTION + 7);
    static final int TRANSACTION_getPrintedLength = (android.os.IBinder.FIRST_CALL_TRANSACTION + 8);
    static final int TRANSACTION_lineWrap = (android.os.IBinder.FIRST_CALL_TRANSACTION + 9);
    static final int TRANSACTION_sendRAWData = (android.os.IBinder.FIRST_CALL_TRANSACTION + 10);
    static final int TRANSACTION_setAlignment = (android.os.IBinder.FIRST_CALL_TRANSACTION + 11);
    static final int TRANSACTION_setFontName = (android.os.IBinder.FIRST_CALL_TRANSACTION + 12);
    static final int TRANSACTION_setFontSize = (android.os.IBinder.FIRST_CALL_TRANSACTION + 13);
    static final int TRANSACTION_printText = (android.os.IBinder.FIRST_CALL_TRANSACTION + 14);
    static final int TRANSACTION_printTextWithFont = (android.os.IBinder.FIRST_CALL_TRANSACTION + 15);
    static final int TRANSACTION_printColumnsText = (android.os.IBinder.FIRST_CALL_TRANSACTION + 16);
    static final int TRANSACTION_printBitmap = (android.os.IBinder.FIRST_CALL_TRANSACTION + 17);
    static final int TRANSACTION_printBarCode = (android.os.IBinder.FIRST_CALL_TRANSACTION + 18);
    static final int TRANSACTION_printQRCode = (android.os.IBinder.FIRST_CALL_TRANSACTION + 19);
    static final int TRANSACTION_printOriginalText = (android.os.IBinder.FIRST_CALL_TRANSACTION + 20);
    static final int TRANSACTION_commitPrinterBuffer = (android.os.IBinder.FIRST_CALL_TRANSACTION + 21);
    static final int TRANSACTION_enterPrinterBuffer = (android.os.IBinder.FIRST_CALL_TRANSACTION + 22);
    static final int TRANSACTION_exitPrinterBuffer = (android.os.IBinder.FIRST_CALL_TRANSACTION + 23);
    static final int TRANSACTION_setFontBold = (android.os.IBinder.FIRST_CALL_TRANSACTION + 24);
    static final int TRANSACTION_getPrinterStatus = (android.os.IBinder.FIRST_CALL_TRANSACTION + 25);
  }
  public static final java.lang.String DESCRIPTOR = "woyou.aidlservice.jiuiv5.IWoyouService";
  /**
   * TRANSACTION +0 (must stay first - system only)
   * Replaces updateFirmware(); system use only.
   */
  public boolean postPrintData(java.lang.String packageName, byte[] data, int offset, int length) throws android.os.RemoteException;
  /**
   * TRANSACTION +1
   * Printer firmware status: 0=unknown, A5=bootloader, C3=print
   */
  public int getFirmwareStatus() throws android.os.RemoteException;
  /**
   * TRANSACTION +2
   * Get the WoyouService service version string
   */
  public java.lang.String getServiceVersion() throws android.os.RemoteException;
  /**
   * TRANSACTION +3
   * Initialize the printer (resets logic, does NOT clear buffer)
   */
  public void printerInit(woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException;
  /**
   * TRANSACTION +4
   * Printer self-checking — prints the hardware self-test page
   */
  public void printerSelfChecking(woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException;
  /**
   * TRANSACTION +5
   * Get the printer board serial number
   */
  public java.lang.String getPrinterSerialNo() throws android.os.RemoteException;
  /**
   * TRANSACTION +6
   * Get the printer firmware version
   */
  public java.lang.String getPrinterVersion() throws android.os.RemoteException;
  /**
   * TRANSACTION +7
   * Get the printer model/modal string
   */
  public java.lang.String getPrinterModal() throws android.os.RemoteException;
  /**
   * TRANSACTION +8
   * Get total paper length printed since power-on (returned via onReturnString callback)
   */
  public void getPrintedLength(woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException;
  /**
   * TRANSACTION +9
   * Feed n lines of paper
   */
  public void lineWrap(int n, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException;
  /**
   * TRANSACTION +10
   * Send raw ESC/POS commands directly
   */
  public void sendRAWData(byte[] data, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException;
  /**
   * TRANSACTION +11
   * Set alignment: 0=Left, 1=Center, 2=Right
   */
  public void setAlignment(int alignment, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException;
  /**
   * TRANSACTION +12
   * Set font name (system-only; external calls have no effect)
   */
  public void setFontName(java.lang.String typeface, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException;
  /**
   * TRANSACTION +13
   * Set font size (affects subsequent print calls until re-init)
   */
  public void setFontSize(float fontSize, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException;
  /**
   * TRANSACTION +14
   * Print text — auto word-wraps at line width; won't print partial lines
   */
  public void printText(java.lang.String text, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException;
  /**
   * TRANSACTION +15
   * Print text with a specific font (typeface has no effect for external apps)
   */
  public void printTextWithFont(java.lang.String text, java.lang.String typeface, float fontSize, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException;
  /**
   * TRANSACTION +16
   * Print a table row with column widths and per-column alignment
   */
  public void printColumnsText(java.lang.String[] colsTextArr, int[] colsWidthArr, int[] colsAlign, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException;
  /**
   * TRANSACTION +17
   * Print a bitmap image
   */
  public void printBitmap(android.graphics.Bitmap bitmap, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException;
  /**
   * TRANSACTION +18
   * Print a 1D barcode
   * symbology: 0=UPC-A, 1=UPC-E, 2=JAN13(EAN), 3=JAN8(EAN), 4=CODE39, 5=ITF, 6=CODABAR, 7=CODE93, 8=CODE128
   * textPosition: 0=none, 1=above, 2=below, 3=both
   */
  public void printBarCode(java.lang.String data, int symbology, int height, int width, int textPosition, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException;
  /**
   * TRANSACTION +19
   * Print a QR code
   * moduleSize: 1-16
   * errorCorrectionLevel: 0=L, 1=M, 2=Q, 3=H
   */
  public void printQRCode(java.lang.String data, int moduleSize, int errorCorrectionLevel, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException;
  /**
   * TRANSACTION +20
   * Print text in original (double-byte ESC/POS) mode
   */
  public void printOriginalText(java.lang.String text, woyou.aidlservice.jiuiv5.ICallback callback) throws android.os.RemoteException;
  /**
   * TRANSACTION +21
   * Commit a print job — all prior commands are printed as one atomic job
   */
  public void commitPrinterBuffer() throws android.os.RemoteException;
  /**
   * TRANSACTION +22
   * Enter print transaction buffer mode
   */
  public void enterPrinterBuffer(boolean clean) throws android.os.RemoteException;
  /**
   * TRANSACTION +23
   * Exit print transaction buffer mode
   */
  public void exitPrinterBuffer(boolean commit) throws android.os.RemoteException;
  /**
   * TRANSACTION +24
   * Set bold printing: 0=normal, 1=bold
   */
  public void setFontBold(boolean isBold) throws android.os.RemoteException;
  /**
   * TRANSACTION +25
   * Get printer status: 1=Normal, 2=Out of paper, 3=Overheat, 4=Other exception
   */
  public int getPrinterStatus() throws android.os.RemoteException;
  /** @hide */
  static class _Parcel {
    static private <T> T readTypedObject(
        android.os.Parcel parcel,
        android.os.Parcelable.Creator<T> c) {
      if (parcel.readInt() != 0) {
          return c.createFromParcel(parcel);
      } else {
          return null;
      }
    }
    static private <T extends android.os.Parcelable> void writeTypedObject(
        android.os.Parcel parcel, T value, int parcelableFlags) {
      if (value != null) {
        parcel.writeInt(1);
        value.writeToParcel(parcel, parcelableFlags);
      } else {
        parcel.writeInt(0);
      }
    }
  }
}
