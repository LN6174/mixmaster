/**
 * Barcode & OCR Scanning Service
 * 
 * 移动端酒瓶识别方案设计
 * 支持: 条码识别 + 酒标文字识别
 */

const SCAN_CONFIG = {
  barcode: {
    enabled: true,
    formats: ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'CODE_128', 'CODE_39'],
  },
  ocr: {
    enabled: true,
    languages: ['en', 'zh-CN', 'ja', 'es'],
    minConfidence: 0.6,
  },
};

/**
 * 扫描结果
 * @typedef {Object} ScanResult
 * @property {'barcode'|'ocr'|'manual'} type - 识别类型
 * @property {string} rawValue - 原始识别值
 * @property {Object} [ingredient] - 匹配的原料
 * @property {number} confidence - 置信度
 * @property {string} [error] - 错误信息
 */

/**
 * 识别酒瓶并添加到酒柜
 * @param {File|string} imageSource - 图片或相机流
 * @returns {Promise<ScanResult>}
 */
export async function scanBottle(imageSource) {
  try {
    const barcodeResult = await scanBarcode(imageSource);
    if (barcodeResult.success && barcodeResult.data) {
      const match = await lookupByBarcode(barcodeResult.data);
      if (match) {
        return {
          type: 'barcode',
          rawValue: barcodeResult.data,
          ingredient: match,
          confidence: 1.0,
        };
      }
    }

    const ocrResult = await scanLabel(imageSource);
    if (ocrResult.success && ocrResult.text) {
      const match = await lookupByText(ocrResult.text, ocrResult.confidence);
      if (match) {
        return {
          type: 'ocr',
          rawValue: ocrResult.text,
          ingredient: match,
          confidence: ocrResult.confidence,
        };
      }
    }

    return {
      type: 'manual',
      rawValue: null,
      ingredient: null,
      confidence: 0,
      error: '未能识别，请手动选择',
    };
  } catch (error) {
    return {
      type: 'manual',
      rawValue: null,
      ingredient: null,
      confidence: 0,
      error: error.message,
    };
  }
}

/**
 * 使用条码查询原料
 * @param {string} barcode
 * @returns {Promise<Object|null>}
 */
async function lookupByBarcode(barcode) {
  const response = await fetch(`/api/ingredients/barcode/${barcode}`);
  if (response.ok) {
    return await response.json();
  }
  return null;
}

/**
 * 使用文字匹配原料
 * @param {string} text
 * @param {number} confidence
 * @returns {Promise<Object|null>}
 */
async function lookupByText(text, confidence) {
  if (confidence < SCAN_CONFIG.ocr.minConfidence) {
    return null;
  }

  const response = await fetch('/api/ingredients/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: text, matchMode: 'fuzzy' }),
  });

  if (response.ok) {
    const results = await response.json();
    return results[0] || null;
  }
  return null;
}

/**
 * 伪代码: 扫描条码 (使用 expo-barcode-scanner / mobile-scanner)
 */
export function scanBarcode(imageSource) {
  return new Promise((resolve) => {
    import('mobile-scanner').then(({ MobileScanner }) => {
      const scanner = new MobileScanner({
        formats: SCAN_CONFIG.barcode.formats,
      });

      scanner.onDetect((detections) => {
        if (detections.length > 0) {
          const barcode = detections[0].rawValue;
          scanner.stop();
          resolve({ success: true, data: barcode });
        }
      });

      scanner.start();
    }).catch(() => {
      resolve({ success: false, error: 'Scanner not available' });
    });
  });
}

/**
 * 伪代码: OCR 识别酒标 (使用 ML Kit / Google Cloud Vision)
 */
export function scanLabel(imageSource) {
  return new Promise((resolve) => {
    import('@react-native-ml-kit/text-recognition').then(({ TextRecognizer }) => {
      const recognizer = new TextRecognizer({
        languages: SCAN_CONFIG.ocr.languages,
      });

      recognizer.process(imageSource)
        .then((result) => {
          const text = result.text;
          const confidence = result.blocks.reduce((acc, block) => 
            acc + block.confidence, 0) / (result.blocks.length || 1);

          resolve({
            success: true,
            text: cleanText(text),
            confidence,
          });
        })
        .catch((error) => {
          resolve({ success: false, error: error.message });
        });
    }).catch(() => {
      resolve({ success: false, error: 'OCR not available' });
    });
  });
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\u4e00-\u9fa5\s]/g, '')
    .trim()
    .substring(0, 200);
}

/**
 * 手动搜索添加
 * @param {string} query
 * @returns {Promise<Array>}
 */
export async function searchIngredients(query) {
  const response = await fetch(`/api/ingredients/search?q=${encodeURIComponent(query)}`);
  return await response.json();
}

/**
 * 添加到酒柜
 * @param {string} ingredientId
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function addToPantry(ingredientId, options = {}) {
  const response = await fetch('/api/user/pantry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ingredient_id: ingredientId,
      ...options,
    }),
  });
  return await response.json();
}

export { SCAN_CONFIG };
