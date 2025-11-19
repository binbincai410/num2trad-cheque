/**
 * 从 CSV 文件读取测试用例并验证转换器
 */

const fs = require('fs');
const path = require('path');

// 读取并解析 CSV 文件
function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    
    // 跳过标题行
    const testCases = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // 简单的 CSV 解析（假设没有逗号在引号内的情况）
        const parts = line.split(',');
        if (parts.length >= 2) {
            testCases.push({
                input: parts[0].trim(),
                expected: parts[1].trim()
            });
        }
    }
    
    return testCases;
}

// 加载转换器核心逻辑（不包含 DOM 部分）
const digitMap = {
    '0': '零', '1': '壹', '2': '貳', '3': '參', '4': '肆',
    '5': '伍', '6': '陸', '7': '柒', '8': '捌', '9': '玖'
};

const units = ['', '拾', '佰', '仟'];
const bigUnits = ['', '萬', '億', '兆'];

function convertSection(num) {
    if (num === 0) return '';
    
    let result = '';
    let numStr = num.toString();
    let len = numStr.length;
    let zeroFlag = false;
    
    for (let i = 0; i < len; i++) {
        let digit = numStr[i];
        let unit = units[len - 1 - i];
        
        if (digit === '0') {
            zeroFlag = true;
        } else {
            if (zeroFlag && result) {
                result += '零';
            }
            result += digitMap[digit] + unit;
            zeroFlag = false;
        }
    }
    
    return result;
}

function convertInteger(num) {
    if (num === 0) return '零';
    
    const sections = [];
    let tempNum = num;
    while (tempNum > 0) {
        sections.push(tempNum % 10000);
        tempNum = Math.floor(tempNum / 10000);
    }
    
    let result = '';
    
    for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const sectionStr = convertSection(section);
        
        if (section > 0) {
            if (i < sections.length - 1 && section < 1000 && result) {
                result += '零';
            }
            
            result += sectionStr + bigUnits[i];
        } else {
            if (i > 0 && result) {
                let hasNonZeroAfter = false;
                for (let j = i - 1; j >= 0; j--) {
                    if (sections[j] > 0) {
                        hasNonZeroAfter = true;
                        break;
                    }
                }
                if (hasNonZeroAfter && i > 0 && sections[i - 1] > 0 && sections[i - 1] < 1000) {
                    result += '零';
                }
            }
        }
    }
    
    result = result.replace(/零+/g, '零');
    result = result.replace(/零([萬億])/g, '$1');
    result = result.replace(/零+$/, '');
    
    return result;
}

function convertToChequeFormat(numStr) {
    numStr = numStr.replace(/[,\s]/g, '');
    
    if (!numStr) {
        return '請輸入金額';
    }
    
    if (!/^-?\d+(\.\d{0,2})?$/.test(numStr)) {
        return '輸入格式錯誤（請輸入有效數字）';
    }
    
    let num = parseFloat(numStr);
    
    if (num < 0) {
        return '不支持負數';
    }
    
    if (num >= 100000) {
        return '超過最大支持金額（99999.99）';
    }
    
    if (num === 0) {
        return '零圓整';
    }
    
    let parts = numStr.split('.');
    let integerPart = parseInt(parts[0]);
    let decimalPart = parts[1] || '';
    
    let result = convertInteger(integerPart) + '圓';
    
    if (decimalPart) {
        while (decimalPart.length < 2) {
            decimalPart += '0';
        }
        
        let jiao = decimalPart[0];
        let fen = decimalPart[1];
        
        if (jiao === '0' && fen === '0') {
            result += '整';
        } else if (jiao !== '0') {
            result += digitMap[jiao] + '角';
            if (fen !== '0') {
                result += digitMap[fen] + '分';
            }
        } else {
            if (fen !== '0') {
                result += '零' + digitMap[fen] + '分';
            }
        }
    } else {
        result += '整';
    }
    
    return result;
}

// 运行测试
function runTests() {
    const csvPath = path.join(__dirname, '用例.csv');
    const testCases = parseCSV(csvPath);
    
    console.log('\n🧪 使用 CSV 文件测试转换器\n');
    console.log('=' .repeat(100));
    console.log(`${'序号'.padEnd(6)} | ${'输入'.padEnd(20)} | ${'预期输出'.padEnd(30)} | ${'实际输出'.padEnd(30)} | 结果`);
    console.log('=' .repeat(100));
    
    let passed = 0;
    let failed = 0;
    const failedCases = [];
    
    testCases.forEach((testCase, index) => {
        const actual = convertToChequeFormat(testCase.input);
        const isPass = actual === testCase.expected;
        
        if (isPass) {
            passed++;
        } else {
            failed++;
            failedCases.push({
                index: index + 1,
                input: testCase.input,
                expected: testCase.expected,
                actual: actual
            });
        }
        
        const status = isPass ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
        const num = String(index + 1).padEnd(6);
        const input = testCase.input.padEnd(20);
        const expected = testCase.expected.padEnd(30);
        const actualPadded = actual.padEnd(30);
        
        console.log(`${num} | ${input} | ${expected} | ${actualPadded} | ${status}`);
    });
    
    console.log('=' .repeat(100));
    console.log(`\n总计: ${testCases.length} 个测试 | 通过: \x1b[32m${passed}\x1b[0m | 失败: \x1b[31m${failed}\x1b[0m`);
    
    if (failed > 0) {
        console.log('\n\x1b[31m失败的测试用例详情：\x1b[0m\n');
        failedCases.forEach(testCase => {
            console.log(`\x1b[31m✗ 测试 #${testCase.index}\x1b[0m`);
            console.log(`  输入:   ${testCase.input}`);
            console.log(`  预期:   ${testCase.expected}`);
            console.log(`  实际:   ${testCase.actual}`);
            console.log('');
        });
    }
    
    const passRate = ((passed / testCases.length) * 100).toFixed(2);
    console.log(`\n通过率: ${passRate}%\n`);
    
    if (failed === 0) {
        console.log('\x1b[32m✓ 所有测试通过！\x1b[0m\n');
        process.exit(0);
    } else {
        console.log('\x1b[31m✗ 有测试失败，请检查上述失败用例！\x1b[0m\n');
        process.exit(1);
    }
}

// 执行测试
try {
    runTests();
} catch (error) {
    console.error('\x1b[31m测试执行出错：\x1b[0m', error.message);
    process.exit(1);
}

