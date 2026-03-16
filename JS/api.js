/**
 * API Utility for ChomChon
 * Handles centralized fetch requests with built-in timeouts and error handling.
 */
const API = {
    timeout: 10000, // 10 seconds timeout

    /**
     * @param {string} action - The action parameter for the backend
     * @param {Object} data - Parameters to send (as URLSearchParams)
     * @param {number} customTimeout - Optional custom timeout in ms
     */
    async request(action, data = {}, customTimeout = null) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), customTimeout || this.timeout);

        try {
            const params = new URLSearchParams({ action, ...data });
            
            // Auto-append token if available and not already provided
            const userDataStr = localStorage.getItem('userSession');
            if (userDataStr) {
                const userData = JSON.parse(userDataStr);
                if (userData.token && !params.has('token')) {
                    params.append('token', userData.token);
                }
            }

            const response = await fetch(CONFIG.SCRIPT_URL, {
                method: 'POST',
                body: params,
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error("การเชื่อมต่อหมดเวลา (Timeout) กรุณาลองใหม่อีกครั้ง");
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }
};
