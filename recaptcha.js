/**
 * Class representing a wrapper for Google reCAPTCHA V3 fallback to V2.
 */

class SRecaptcha {
  /**
   * Create a new SRecaptcha instance.
   * @param {string} formSelector - The CSS selector for the form element.
   * @param {Function} callback - The callback function to execute after reCAPTCHA verification.
   * @param {string} recaptchaAction - The action name for reCAPTCHA verification.
   * @param {string} recaptchaKeyV2 - The reCAPTCHA v2 site key.
   * @param {string} recaptchaKeyV3 - The reCAPTCHA v3 site key.
   * @param {boolean} [loadScripts=true] - Whether to automatically load reCAPTCHA scripts.
   * @param {boolean} [enabled=true] - Whether reCAPTCHA is enabled.
   * @param {number} [timeout=5000] - The timeout duration in milliseconds for waiting for reCAPTCHA.
   */
  constructor(
    formSelector,
    callback,
    recaptchaAction,
    recaptchaKeyV2,
    recaptchaKeyV3,
    loadScripts = true,
    enabled = true,
    timeout = 5000
  ) {
    // Initialize properties
    this.formSelector = formSelector;
    this.callback = callback;
    this.recaptchaAction = recaptchaAction;
    this.recaptchaKeyV2 = recaptchaKeyV2;
    this.recaptchaKeyV3 = recaptchaKeyV3;
    this.loadScripts = loadScripts;
    this.enabled = enabled;
    this.timeout = timeout;
    this.isExecuting = false;
    // Get the form element
    this.formElement = document.querySelector(this.formSelector);

    // Load reCAPTCHA scripts if enabled
    if (this.loadScripts) {
      this.loadRecaptchaScript();
    }
  }

  get formSelector() {
    return this._formSelector;
  }

  set formSelector(value) {
    if (typeof value !== 'string') this.throwError('Invalid formSelector: String expected.');
    this._formSelector = value;
    this.formElement = document.querySelector(this._formSelector);
  }

  get callback() {
    return this._callback;
  }

  set callback(value) {
    if (typeof value !== 'function') this.throwError('Invalid callback: Function expected.');
    this._callback = value;
  }

  get recaptchaAction() {
    return this._recaptchaAction;
  }

  set recaptchaAction(value) {
    if (typeof value !== 'string' || !value.trim())
      this.throwError('Invalid recaptchaAction: Non-empty string expected.');
    this._recaptchaAction = value;
  }

  get recaptchaKeyV2() {
    return this._recaptchaKeyV2;
  }

  set recaptchaKeyV2(value) {
    if (typeof value !== 'string' || !value.trim())
      this.throwError('Invalid recaptchaKeyV2: Non-empty string expected.');
    this._recaptchaKeyV2 = value;
  }

  get recaptchaKeyV3() {
    return this._recaptchaKeyV3;
  }

  set recaptchaKeyV3(value) {
    if (typeof value !== 'string' || !value.trim())
      this.throwError('Invalid recaptchaKeyV3: Non-empty string expected.');
    this._recaptchaKeyV3 = value;
  }

  get enabled() {
    return this._enabled;
  }

  set enabled(value) {
    this._enabled = value;
  }

  get formElement() {
    return this._formElement;
  }

  set formElement(value) {
    if (!(value instanceof HTMLElement))
      this.throwError('Invalid formElement: HTMLElement expected.');
    this._formElement = value;
  }

  get timeout() {
    return this._timeout;
  }

  set timeout(value) {
    if (typeof value !== 'number' || value < 0) {
      this.throwError('Invalid timeout: Positive number expected.');
    }
    this._timeout = value;
  }

  /**
   * Throws an error with the given message.
   * @param {string} message - The error message.
   */
  throwError(message) {
    throw new Error(message);
  }

  /**
   * Asynchronously waits for reCAPTCHA to be ready or loads the script if it's not loaded.
   * @returns {Promise<void>} A promise that resolves when reCAPTCHA is ready.
   */
  async waitForRecaptcha() {
    const startTime = Date.now();

    const checkRecaptcha = async (resolve, reject) => {
      if (typeof grecaptcha !== 'undefined' && typeof grecaptcha.execute !== 'undefined') {
        resolve();
      } else if (Date.now() - startTime > this.timeout) {
        try {
          await this.loadRecaptchaScript();
          resolve();
        } catch (error) {
          reject(error);
        }
      } else {
        setTimeout(() => checkRecaptcha(resolve, reject), 100);
      }
    };

    return new Promise(checkRecaptcha);
  }

  /**
   * Creates a hidden input element in the form.
   * @param {string} name - The name attribute for the input element.
   * @returns {HTMLInputElement} The created input element.
   */
  createHiddenInput(name) {
    const existingInput = this.formElement.querySelector(`input[name="${name}"]`);
    if (existingInput) return existingInput;

    const newInput = document.createElement('input');
    newInput.type = 'hidden';
    newInput.name = name;
    this.formElement.appendChild(newInput);
    return newInput;
  }

  /**
   * Executes reCAPTCHA v3 verification.
   * @returns {Promise<void>} A promise that resolves after reCAPTCHA v3 verification.
   */
  async executeV3Recaptcha() {
    this.removeRecaptchaFields();
    const tokenElement = this.createHiddenInput('g-recaptcha-response');
    const versionElement = this.createHiddenInput('g-recaptcha-type');

    try {
      const token = await grecaptcha.execute(this.recaptchaKeyV3, {
        action: this.recaptchaAction,
      });
      tokenElement.value = token;
      versionElement.value = 'v3';
      return await this.callback();
    } catch (error) {
      console.error('Error executing V3 Recaptcha:', error);
    }
  }

  /**
   * Removes reCAPTCHA fields from the form.
   */
  removeRecaptchaFields() {
    ['g-recaptcha-type', 'g-recaptcha-response'].forEach((name) => {
      const field = this.formElement.querySelector(`input[name='${name}']`);
      if (field) field.remove();
    });
  }

  /**
   * Executes reCAPTCHA v2 verification.
   * @returns {Promise<void>} A promise that resolves after reCAPTCHA v2 verification.
   */
  async executeV2Recaptcha() {
    this.removeRecaptchaFields();

    if (this.formElement.querySelector('.g-recaptcha')) return;

    const recaptchaDiv = document.createElement('div');
    recaptchaDiv.classList.add('g-recaptcha');
    this.formElement.appendChild(recaptchaDiv);
    this.formElement.classList.add('s-recaptcha-active');

    const versionElement = this.createHiddenInput('g-recaptcha-type');

    return new Promise((resolve, reject) => {
      grecaptcha.render(recaptchaDiv, {
        sitekey: this.recaptchaKeyV2,
        callback: async (token) => {
          versionElement.value = 'v2';
          await this.callback();
          recaptchaDiv.remove();
          this.formElement.classList.remove('s-recaptcha-active');
          resolve();
        },
        'expired-callback': () => {
          console.error('V2 Recaptcha Expired');
          reject(new Error('V2 Recaptcha Expired'));
        },
        'error-callback': () => {
          console.error('V2 Recaptcha Server Error');
          reject(new Error('V2 Recaptcha Server Error'));
        },
      });
    });
  }

  /**
   * Executes reCAPTCHA verification.
   */
  async execute() {
    if (this.isExecuting) {
      console.warn('reCAPTCHA is already executing');
      return;
    }

    this.isExecuting = true;

    if (!this.enabled) {
      this.removeRecaptchaFields();
      try {
        await this.callback();
      } catch (error) {
        console.error('Error executing callback:', error);
      } finally {
        this.isExecuting = false;
      }
      return;
    }

    try {
      await this.waitForRecaptcha();
      const response = await this.executeV3Recaptcha();
      if (
        response?.data?.reason === 'FailRecaptcha' ||
        response?.ResponseMessage === 'FailRecaptcha'
      ) {
        console.warn('V3 Recaptcha Failed');
        await this.executeV2Recaptcha();
      }
    } catch (error) {
      console.error('Error executing Recaptcha:', error);
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Loads the reCAPTCHA script dynamically.
   * @returns {Promise<void>} A promise that resolves when the script is loaded successfully.
   */
  async loadRecaptchaScript() {
    document
      .querySelectorAll(
        'script[src*="www.google.com/recaptcha"], script[src*="www.gstatic.com/recaptcha"]'
      )
      .forEach((file) => file.remove());

    const scriptUrl = `https://www.google.com/recaptcha/api.js?render=${this.recaptchaKeyV3}`;

    const script = document.createElement('script');
    script.src = scriptUrl;

    return new Promise((resolve, reject) => {
      script.onload = () => {
        console.log('reCAPTCHA script loaded successfully');
        resolve();
      };

      script.onerror = () => {
        console.error('Failed to load reCAPTCHA script');
        reject(new Error('Failed to load reCAPTCHA script'));
      };

      document.head.appendChild(script);
    });
  }
}

export default SRecaptcha;
