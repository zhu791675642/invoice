// @ts-ignore;
import React, { useState } from 'react';
// @ts-ignore;
import { useToast } from '@/components/ui';

/**
 * 发票识别Hook - 修复版
 * 兼容腾讯云文档型数据库 + TextIn API v2
 */
export function useInvoiceRecognizer() {
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    toast
  } = useToast();
  const fileToBase64 = file => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(new Error(`文件读取失败: ${error.message}`));
      reader.readAsDataURL(file);
    });
  };
  const validateFile = file => {
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        message: `文件过大，最大支持 ${Math.round(maxSize / 1024 / 1024)}MB`
      };
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/gif', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        message: '不支持的文件格式'
      };
    }
    return {
      valid: true
    };
  };

  /**
   * 从 TextIn 返回的 item_list 中提取指定字段值
   */
  const extractFieldValue = (itemList, key) => {
    if (!itemList || !Array.isArray(itemList)) return '';
    const item = itemList.find(i => i.key === key);
    return item?.value || '';
  };

  /**
   * 提取发票关键信息 - 完整版
   * 包含所有需要导出的字段
   */
  const extractInvoiceInfo = recognitionData => {
    const invoiceData = recognitionData.invoiceData;
    const itemList = invoiceData?.item_list || [];

    // 提取所有关键字段
    const invoiceInfo = {
      // 基础信息
      invoiceType: recognitionData.invoiceType || '未知类型',
      invoiceCode: extractFieldValue(itemList, 'invoice_code'),
      invoiceNumber: extractFieldValue(itemList, 'invoice_number'),
      invoiceDate: extractFieldValue(itemList, 'invoice_date'),
      // 金额信息
      amount: extractFieldValue(itemList, 'total_amount'),
      taxAmount: extractFieldValue(itemList, 'tax_amount'),
      // 车辆信息
      carPlate: extractFieldValue(itemList, 'car_plate'),
      // 地址信息
      invoiceLocation: extractFieldValue(itemList, 'invoice_location'),
      // 印章信息
      supervisoryStamp: extractFieldValue(itemList, 'supervisory_stamp'),
      invoiceStamp: extractFieldValue(itemList, 'invoice_stamp'),
      // 人员信息
      sellerName: extractFieldValue(itemList, 'seller_name'),
      buyerName: extractFieldValue(itemList, 'buyer_name'),
      // 其他信息
      fileName: recognitionData.fileName,
      fileSize: recognitionData.fileSize,
      fileType: recognitionData.fileType,
      recognitionTime: recognitionData.recognitionTime,
      recognitionStatus: 'success',
      auditStatus: 'pending',
      auditExceptions: '',
      auditTime: '',
      // 完整的 API 响应（用于备份）
      apiResponse: JSON.stringify(recognitionData)
    };
    return invoiceInfo;
  };

  /**
   * 保存到腾讯云文档型数据库
   */
  const saveToTencentDB = async invoiceInfo => {
    try {
      console.log('开始保存发票数据到腾讯云文档型数据库...');
      console.log('待保存数据:', invoiceInfo);

      // 调用云函数保存数据
      const saveResult = await window.$w.cloud.callFunction({
        name: 'textin-bill-recognition',
        data: {
          action: 'save',
          record: invoiceInfo
        }
      });
      console.log('✅ 发票数据保存成功:', saveResult);
      return saveResult;
    } catch (error) {
      console.error('❌ 保存发票数据失败:', error);
      throw error;
    }
  };
  const recognizeInvoice = async (file, options = {}) => {
    setIsProcessing(true);
    setCurrentFile(file);
    setRecognitionResult(null);
    try {
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.message);
      }
      console.log('========================================');
      console.log('开始处理文件:', file.name);
      console.log('文件验证通过:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      const fileBase64 = await fileToBase64(file);
      if (!fileBase64) {
        throw new Error('文件转换失败');
      }
      console.log('base64 转换成功');
      console.log('调用云函数: textin-bill-recognition');
      const cloudResult = await window.$w.cloud.callFunction({
        name: 'textin-bill-recognition',
        data: {
          action: 'recognize',
          fileBase64: fileBase64,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          options: options
        }
      });
      console.log('========================================');
      console.log('云函数返回结果:', cloudResult);
      console.log('cloudResult 类型:', typeof cloudResult);
      console.log('cloudResult 的键:', Object.keys(cloudResult || {}));
      console.log('========================================');

      // 腾讯云会包装返回值，所以需要检查 result 字段
      let apiResponse = cloudResult;

      // 如果被腾讯云包装了，取出 result
      if (cloudResult.result && typeof cloudResult.result === 'object') {
        console.log('检测到腾讯云包装格式，提取 result');
        apiResponse = cloudResult.result;
      }
      console.log('提取后的 apiResponse:', apiResponse);
      console.log('apiResponse 的键:', Object.keys(apiResponse || {}));

      // ✅ 修复：检查 code === 0（成功）而不是 code === 200
      if (!apiResponse || apiResponse.code !== 0) {
        const errorMsg = apiResponse?.message || '识别失败';
        throw new Error(`识别失败 (${apiResponse?.code}): ${errorMsg}`);
      }

      // 检查 data 字段
      if (!apiResponse.data) {
        console.error('❌ data 为空');
        console.error('apiResponse:', JSON.stringify(apiResponse, null, 2));
        throw new Error('识别结果为空，请检查图片质量');
      }
      console.log('✅ data 存在');

      // 提取识别结果
      const invoiceData = apiResponse.data;
      console.log('发票数据:', invoiceData);

      // 保存结果
      const finalData = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        recognitionTime: new Date().toISOString(),
        invoiceType: invoiceData?.type_description || '未知类型',
        invoiceData: invoiceData,
        success: true
      };
      setRecognitionResult(finalData);

      // ✅ 提取关键信息并保存到数据库
      try {
        const invoiceInfo = extractInvoiceInfo(finalData);
        await saveToTencentDB(invoiceInfo);
        toast({
          title: '识别成功',
          description: `文件 ${file.name} 已成功识别并保存到云端，发票类型：${finalData.invoiceType}`
        });
      } catch (saveError) {
        console.error('❌ 保存发票数据失败:', saveError);
        toast({
          title: '识别成功但保存失败',
          description: `文件 ${file.name} 识别成功，但保存到云端时出错：${saveError.message}`,
          variant: 'destructive'
        });
      }
      console.log('========================================');
      console.log('✅ 识别完成');
      console.log('发票类型:', finalData.invoiceType);
      console.log('发票号码:', invoiceData?.item_list?.find(item => item.key === 'invoice_number')?.value);
      console.log('========================================');
      return finalData;
    } catch (error) {
      console.error('========================================');
      console.error('❌ 发票识别错误');
      console.error('错误信息:', error.message);
      console.error('========================================');
      toast({
        title: '识别失败',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 导出识别结果到 CSV
   */
  const exportToExcel = recognitionResults => {
    if (!recognitionResults || recognitionResults.length === 0) {
      toast({
        title: '无数据可导出',
        variant: 'destructive'
      });
      return;
    }
    try {
      // 定义导出的字段
      const exportFields = [{
        key: 'fileName',
        label: '文件名'
      }, {
        key: 'invoiceType',
        label: '发票类型'
      }, {
        key: 'invoiceCode',
        label: '发票代码'
      }, {
        key: 'invoiceNumber',
        label: '发票号码'
      }, {
        key: 'invoiceDate',
        label: '发票日期'
      }, {
        key: 'carPlate',
        label: '车牌号'
      }, {
        key: 'invoiceLocation',
        label: '发票所在地'
      }, {
        key: 'supervisoryStamp',
        label: '监制章存在性'
      }, {
        key: 'invoiceStamp',
        label: '发票专用章存在性'
      }, {
        key: 'amount',
        label: '总计金额'
      }, {
        key: 'taxAmount',
        label: '税额'
      }, {
        key: 'sellerName',
        label: '销售方'
      }, {
        key: 'buyerName',
        label: '购买方'
      }, {
        key: 'recognitionTime',
        label: '识别时间'
      }, {
        key: 'auditStatus',
        label: '审核状态'
      }];
      const headers = exportFields.map(f => f.label);
      const rows = recognitionResults.map(result => {
        const invoiceInfo = extractInvoiceInfo(result);
        return exportFields.map(field => {
          const value = invoiceInfo[field.key] || '';
          return `"${value.toString().replace(/"/g, '""')}"`;
        });
      });
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;'
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `发票识别结果_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast({
        title: '导出成功',
        description: `已导出 ${recognitionResults.length} 条记录`
      });
    } catch (error) {
      console.error('导出错误:', error);
      toast({
        title: '导出失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  return {
    recognizeInvoice,
    exportToExcel,
    isProcessing,
    recognitionResult,
    extractInvoiceInfo
  };
}