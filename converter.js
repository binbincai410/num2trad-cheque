/**
 * 支票大写金额转换器 - 核心转换逻辑
 * 功能：将阿拉伯数字转换为繁体中文支票大写金额
 */

// 数字到繁体中文的映射
const digitMap = {
    '0': '零', '1': '壹', '2': '貳', '3': '叁', '4': '肆',
    '5': '伍', '6': '陸', '7': '柒', '8': '捌', '9': '玖'
};

// 单位映射
const units = ['', '拾', '佰', '仟'];
const bigUnits = ['', '萬', '億', '兆'];

/**
 * 转换整数部分（处理万以下的数字，即0-9999）
 * @param {number} num - 要转换的数字（0-9999）
 * @returns {string} - 转换后的中文字符串
 */
function convertSection(num) {
    if (num === 0) return '';
    
    let result = '';
    let numStr = num.toString();
    let len = numStr.length;
    let zeroFlag = false; // 标记是否需要补零
    
    for (let i = 0; i < len; i++) {
        let digit = numStr[i];
        let unit = units[len - 1 - i];
        
        if (digit === '0') {
            // 当前位是0，标记需要补零
            zeroFlag = true;
        } else {
            // 当前位不是0
            if (zeroFlag && result) {
                // 如果之前有0且结果不为空，补一个"零"
                result += '零';
            }
            result += digitMap[digit] + unit;
            zeroFlag = false;
        }
    }
    
    return result;
}

/**
 * 转换整数部分（支持亿、万级别的大数）
 * @param {number} num - 要转换的整数
 * @returns {string} - 转换后的中文字符串
 */
function convertInteger(num) {
    if (num === 0) return '零';
    
    let result = '';
    let unitIndex = 0;
    
    while (num > 0) {
        let section = num % 10000;
        let nextNum = Math.floor(num / 10000); // 查看是否还有更高位
        
        if (section > 0) {
            let sectionStr = convertSection(section);
            // 如果还有更高位且当前段小于1000，需要补零
            if (nextNum > 0 && section < 1000) {
                result = '零' + sectionStr + bigUnits[unitIndex] + result;
            } else {
                result = sectionStr + bigUnits[unitIndex] + result;
            }
        } else {
            // 当前段为0，如果还有更高位，只添加单位（零会在后续正则中处理）
            if (nextNum > 0) {
                result = bigUnits[unitIndex] + result;
            }
        }
        
        num = nextNum;
        unitIndex++;
    }
    
    // 清理多余的零
    result = result.replace(/零+/g, '零'); // 多个零合并为一个
    result = result.replace(/零([萬億])/g, '$1'); // 零在万、亿前面时删除
    result = result.replace(/零+$/, ''); // 删除末尾的零
    
    return result;
}

/**
 * 主转换函数：将阿拉伯数字转换为支票大写金额
 * @param {string} numStr - 输入的数字字符串
 * @returns {string} - 转换后的繁体中文大写金额
 */
function convertToChequeFormat(numStr) {
    // 去除空格和逗号
    numStr = numStr.replace(/[,\s]/g, '');
    
    // 处理空输入
    if (!numStr) {
        return '請輸入金額';
    }
    
    // 验证输入格式
    if (!/^-?\d+(\.\d{0,2})?$/.test(numStr)) {
        return '輸入格式錯誤（請輸入有效數字）';
    }
    
    let num = parseFloat(numStr);
    
    // 验证范围
    if (num < 0) {
        return '不支持負數';
    }
    
    if (num > 999999999999.99) {
        return '金額過大（最大支持 999,999,999,999.99）';
    }
    
    if (num === 0) {
        return '零圓整';
    }
    
    // 分离整数和小数部分
    let parts = numStr.split('.');
    let integerPart = parseInt(parts[0]);
    let decimalPart = parts[1] || '';
    
    // 转换整数部分
    let result = convertInteger(integerPart) + '圓';
    
    // 处理小数部分
    if (decimalPart) {
        // 补齐到两位
        while (decimalPart.length < 2) {
            decimalPart += '0';
        }
        
        let jiao = decimalPart[0];
        let fen = decimalPart[1];
        
        if (jiao !== '0') {
            result += digitMap[jiao] + '角';
            if (fen !== '0') {
                result += digitMap[fen] + '分';
            }
        } else {
            // 角为0
            if (fen !== '0') {
                result += '零' + digitMap[fen] + '分';
            }
        }
    } else {
        // 没有小数部分，加"整"
        result += '整';
    }
    
    return result;
}

// ==================== DOM 操作和事件监听 ====================

document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('numberInput');
    const result = document.getElementById('result');
    const copyBtn = document.getElementById('copyBtn');
    const examples = document.querySelectorAll('.example-item');
    
    /**
     * 输入事件监听 - 实时转换
     */
    input.addEventListener('input', function() {
        const value = this.value.trim();
        result.textContent = convertToChequeFormat(value);
        
        // 根据结果类型改变样式
        if (result.textContent.includes('錯誤') || 
            result.textContent.includes('不支持') || 
            result.textContent.includes('過大')) {
            result.classList.add('error');
        } else {
            result.classList.remove('error');
        }
    });
    
    /**
     * 支持回车键触发转换（虽然是实时的，但提供更好的用户体验）
     */
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            this.blur(); // 失去焦点
        }
    });
    
    /**
     * 复制功能
     */
    copyBtn.addEventListener('click', function() {
        const text = result.textContent;
        
        // 如果是错误信息或提示信息，不复制
        if (text.includes('請輸入') || text.includes('錯誤') || 
            text.includes('不支持') || text.includes('過大')) {
            alert('請先輸入有效的金額');
            return;
        }
        
        // 使用 Clipboard API 复制
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✓ 已複製';
                copyBtn.classList.add('copied');
                
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('複製失敗:', err);
                fallbackCopy(text);
            });
        } else {
            // 降级方案
            fallbackCopy(text);
        }
    });
    
    /**
     * 降级复制方案（兼容旧浏览器）
     */
    function fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✓ 已複製';
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            alert('複製失敗，請手動複製');
        } finally {
            document.body.removeChild(textarea);
        }
    }
    
    /**
     * 示例点击功能
     */
    examples.forEach(item => {
        item.addEventListener('click', function() {
            const value = this.dataset.value;
            input.value = value;
            result.textContent = convertToChequeFormat(value);
            result.classList.remove('error');
            
            // 添加点击动画效果
            this.classList.add('clicked');
            setTimeout(() => {
                this.classList.remove('clicked');
            }, 300);
            
            // 滚动到输入框
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });
    
    // 初始化显示
    if (input.value) {
        result.textContent = convertToChequeFormat(input.value);
    }
});

// 导出函数供测试使用（如果需要）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        convertToChequeFormat,
        convertInteger,
        convertSection
    };
}

