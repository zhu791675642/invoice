// @ts-ignore;
import React, { useState } from 'react';
// @ts-ignore;
import { useToast } from '@/components/ui';

/**
 * 发票识别Hook - 最终修复版
 * 兼容腾讯云文档型数据库 + TextIn API v2
 */
export function useInvoiceRecognizer() {
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [historyList, setHistoryList] = useState([]);
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
   * 调用云函数
   */
  const callCloudFunction = async data => {
    const result = await window.$w.cloud.callFunction({
      name: 'textin-bill-recognition',
      data
    });
    // 腾讯云包装格式
    if (result.result && typeof result.result === 'object') {
      return result.result;
    }
    return result;
  };

  /**
   * 识别发票
   */
  const recognizeInvoice = async (file, options = {}) => {
    setIsProcessing(true);
    setCurrentFile(file);
    setRecognitionResult(null);
    try {
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.message);
      }
      console.log('开始处理文件:', file.name);
      const fileBase64 = await fileToBase64(file);
      if (!fileBase64) {
        throw new Error('文件转换失败');
      }

      // ✅ 调用云函数 recognize，云函数会自动保存到数据库
      const apiResponse = await callCloudFunction({
        action: 'recognize',
        fileBase64: fileBase64,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        options: options
      });
      console.log('云函数返回:', apiResponse);

      // 检查返回
      if (!apiResponse || apiResponse.code !== 0) {
        throw new Error(`识别失败 (${apiResponse?.code}): ${apiResponse?.message || '未知错误'}`);
      }
      const data = apiResponse.data || {};
      console.log('识别数据:', data);

      // ✅ 直接使用云函数返回的数据，不需要前端再提取
      const finalData = {
        id: data.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        recognitionTime: new Date().toISOString(),
        invoiceType: data.invoiceType || '未知类型',
        invoiceCode: data.invoiceCode || '',
        invoiceNumber: data.invoiceNumber || '',
        invoiceDate: data.invoiceDate || '',
        amount: data.amount || 0,
        carPlate: data.carPlate || '',
        invoiceLocation: data.invoiceLocation || '',
        supervisoryStamp: data.supervisoryStamp || '',
        invoiceStamp: data.invoiceStamp || '',
        taxiNo: data.taxiNo || '',
        boardingTime: data.boardingTime || '',
        landingTime: data.landingTime || '',
        mileage: data.mileage || '',
        price: data.price || 0,
        success: true
      };
      setRecognitionResult(finalData);
      console.log('✅ 识别完成', finalData);
      toast({
        title: '识别成功',
        description: `发票类型：${finalData.invoiceType}`
      });

      // 刷新历史记录
      loadHistory();
      return finalData;
    } catch (error) {
      console.error('❌ 发票识别错误:', error.message);
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
   * 加载历史记录
   */
  const loadHistory = async () => {
    try {
      console.log('开始加载发票记录...');
      const result = await callCloudFunction({
        action: 'list',
        limit: 20
      });
      if (result.success && result.items) {
        setHistoryList(result.items);
        console.log('✅ 加载成功，记录数:', result.items.length);
      } else {
        console.log('暂无历史记录');
        setHistoryList([]);
      }
    } catch (error) {
      console.error('加载发票记录失败:', error);
      setHistoryList([]);
    }
  };

  /**
   * 删除记录
   */
  const deleteRecord = async id => {
    try {
      await callCloudFunction({
        action: 'delete',
        id
      });
      toast({
        title: '删除成功'
      });
      loadHistory();
    } catch (error) {
      toast({
        title: '删除失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  /**
   * 导出历史记录到 CSV
   */
  const exportToExcel = records => {
    const list = records || historyList;
    if (!list || list.length === 0) {
      toast({
        title: '无数据可导出',
        variant: 'destructive'
      });
      return;
    }
    try {
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
        key: 'taxiNo',
        label: '车号'
      }, {
        key: 'boardingTime',
        label: '上车时间'
      }, {
        key: 'landingTime',
        label: '下车时间'
      }, {
        key: 'mileage',
        label: '里程'
      }, {
        key: 'recognitionTime',
        label: '识别时间'
      }, {
        key: 'auditStatus',
        label: '审核状态'
      }];
      const headers = exportFields.map(f => f.label);
      const rows = list.map(record => {
        return exportFields.map(field => {
          let value = record[field.key] || '';
          if (typeof value === 'number') {
            value = value.toString();
          }
          return `"${value.toString().replace(/"/g, '""')}"`;
        });
      });
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob(['\ufeff' + csvContent], {
        type: 'text/csv;charset=utf-8;'
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `发票识别结果_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast({
        title: '导出成功',
        description: `已导出 ${list.length} 条记录`
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
    loadHistory,
    deleteRecord,
    exportToExcel,
    isProcessing,
    recognitionResult,
    historyList
  };
}