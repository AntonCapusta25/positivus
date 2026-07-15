package woyou.aidlservice.jiuiv5;

/**
 * Printing status callback interface
 */
interface ICallback {
    /**
     * Printing status callback
     * isSuccess: true for print success, false for print failure
     */
    oneway void onRunResult(boolean isSuccess);

    /**
     * Print return value
     * result: return string
     */
    oneway void onReturnString(String result);

    /**
     * Printing status update callback
     * code: status code
     * msg: explanation of status code
     */
    oneway void onRaiseException(int code, String msg);
}
