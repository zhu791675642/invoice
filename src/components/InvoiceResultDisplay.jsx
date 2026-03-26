// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { useToast, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button, Separator, Progress } from '@/components/ui';
// @ts-ignore;
import { CheckCircle, XCircle, Clock, Upload, Download, Eye } from 'lucide-react';

/**
 * 发票识别结果展示组件
 * @param {Object} props - 组件属性
 * @param {Object} props.recognitionResult - 识别结果数据
 * @param {File} props.file - 原始文件
 * @param {Function} props.onUploadToCloud - 上传到云存储的回调
 * @param {Function} props.onAuditComplete - 审核完成的回调
 */
export function InvoiceResultDisplay({
  recognitionResult,
  file,
  onUploadToCloud,
  onAuditComplete
}) {
  const {
    toast
  } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [cloudFileUrl, setCloudFileUrl] = useState(null);

  // 解析识别结果
  const parseRecognitionResult = () => {
    // ✅ 修复：更宽松的数据结构检查
    if (!recognitionResult) {
      console.error('识别结果为空');
      return null;
    }

    // 检查识别结果状态
    if (recognitionResult.success === false || recognitionResult.code !== 200) {
      console.error('识别失败:', recognitionResult.error || recognitionResult.message);
      return null;
    }

    // 检查多种可能的数据结构
    let itemList = [];

    // 方式1：检查标准结构
    if (recognitionResult?.result?.pages?.[0]?.result?.object_list?.[0]?.item_list) {
      itemList = recognitionResult.result.pages[0].result.object_list[0].item_list;
    }
    // 方式2：检查直接包含item_list的结构
    else if (recognitionResult?.invoiceData?.item_list) {
      itemList = recognitionResult.invoiceData.item_list;
    }
    // 方式3：检查pages数组中的item_list
    else if (recognitionResult?.pages?.[0]?.result?.object_list?.[0]?.item_list) {
      itemList = recognitionResult.pages[0].result.object_list[0].item_list;
    }
    // 方式4：检查直接包含item_list的根结构
    else if (recognitionResult?.item_list) {
      itemList = recognitionResult.item_list;
    }
    // 方式5：检查直接包含发票信息的结构
    else if (recognitionResult.invoiceType || recognitionResult.invoiceCode) {
      // 如果已经包含发票信息，直接返回
      return {
        invoiceType: recognitionResult.invoiceType || '',
        invoiceCode: recognitionResult.invoiceCode || '',
        invoiceNumber: recognitionResult.invoiceNumber || '',
        invoiceDate: recognitionResult.invoiceDate || '',
        amount: recognitionResult.amount || recognitionResult.totalAmount || '',
        sellerName: recognitionResult.sellerName || '',
        buyerName: recognitionResult.buyerName || '',
        taxAmount: recognitionResult.taxAmount || '',
        totalAmount: recognitionResult.totalAmount || recognitionResult.amount || '',
        carPlate: recognitionResult.carPlate || ''
      };
    } else {
      console.error('无法解析识别结果结构:', recognitionResult);
      return null;
    }
    if (!itemList || itemList.length === 0) {
      console.error('itemList为空或未定义');
      return null;
    }
    const invoiceInfo = {
      invoiceType: '',
      invoiceCode: '',
      invoiceNumber: '',
      invoiceDate: '',
      amount: '',
      sellerName: '',
      buyerName: '',
      taxAmount: '',
      totalAmount: '',
      carPlate: ''
    };

    // 提取发票信息
    itemList.forEach(item => {
      const value = item.value || item.text || '';
      switch (item.description) {
        case '发票类型':
          invoiceInfo.invoiceType = value;
          break;
        case '发票代码':
          invoiceInfo.invoiceCode = value;
          break;
        case '发票号码':
          invoiceInfo.invoiceNumber = value;
          break;
        case '开票日期':
          invoiceInfo.invoiceDate = value;
          break;
        case '金额':
          invoiceInfo.amount = value;
          break;
        case '销售方名称':
          invoiceInfo.sellerName = value;
          break;
        case '购买方名称':
          invoiceInfo.buyerName = value;
          break;
        case '税额':
          invoiceInfo.taxAmount = value;
          break;
        case '总金额':
          invoiceInfo.totalAmount = value;
          break;
        case '车牌号':
          invoiceInfo.carPlate = value;
          break;
      }
    });
    console.log('解析后的发票信息:', invoiceInfo);
    return invoiceInfo;
  };

  // 上传到云存储
  const handleUploadToCloud = async () => {
    if (!file) {
      toast({
        title: "上传失败",
        description: "请先选择文件",
        variant: "destructive"
      });
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    try {
      // 实时上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      // 获取云开发实例
      const tcb = await window.$w.cloud.getCloudInstance();

      // 生成文件名
      const timestamp = new Date().getTime();
      const fileName = `invoices/${timestamp}_${file.name}`;

      // 上传文件到云存储
      const uploadResult = await tcb.uploadFile({
        cloudPath: fileName,
        filePath: file
      });
      clearInterval(progressInterval);
      setUploadProgress(100);

      // 获取文件访问URL
      const fileUrlResult = await tcb.getTempFileURL({
        fileList: [uploadResult.fileID]
      });
      const fileUrl = fileUrlResult.fileList[0].tempFileURL;
      setCloudFileUrl(fileUrl);
      toast({
        title: "上传成功",
        description: "文件已上传到云存储"
      });

      // 调用父组件回调
      if (onUploadToCloud) {
        onUploadToCloud({
          fileUrl,
          fileId: uploadResult.fileID,
          fileName: file.name,
          uploadTime: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('上传到云存储失败:', error);
      toast({
        title: "上传失败",
        description: error.message || "请检查网络连接",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 执行发票审核
  const handleAuditInvoice = async () => {
    const invoiceInfo = parseRecognitionResult();
    if (!invoiceInfo) {
      toast({
        title: "审核失败",
        description: "无法解析发票信息",
        variant: "destructive"
      });
      return;
    }
    setIsAuditing(true);
    try {
      // 构建审核数据
      const auditData = [{
        invoiceNo: invoiceInfo.invoiceNumber,
        invoiceDate: invoiceInfo.invoiceDate,
        carPlate: invoiceInfo.carPlate || '',
        hasSeal1: false,
        hasSeal2: false
      }];

      // 导入审核工具函数
      const {
        invoiceAuditFlow
      } = await import('@/lib/audit-utils');

      // 执行审核
      const result = await invoiceAuditFlow(auditData);
      setAuditResult(result);
      toast({
        title: "审核完成",
        description: `审核结果: ${result.status}`
      });

      // 调用父组件回调
      if (onAuditComplete) {
        onAuditComplete(result);
      }
    } catch (error) {
      console.error('审核失败:', error);
      toast({
        title: "审核失败",
        description: error.message || "审核过程出现错误",
        variant: "destructive"
      });
    } finally {
      setIsAuditing(false);
    }
  };

  // 预览文件
  const handlePreviewFile = () => {
    if (cloudFileUrl) {
      window.open(cloudFileUrl, '_blank');
    } else if (file) {
      const objectUrl = URL.createObjectURL(file);
      window.open(objectUrl, '_blank');
      // 清理URL对象
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
  };

  // 下载识别结果
  const handleDownloadResult = () => {
    const invoiceInfo = parseRecognitionResult();
    if (!invoiceInfo) return;
    const resultText = `发票识别结果\n\n` + `发票类型: ${invoiceInfo.invoiceType || '未识别'}\n` + `发票代码: ${invoiceInfo.invoiceCode || '未识别'}\n` + `发票号码: ${invoiceInfo.invoiceNumber || '未识别'}\n` + `开票日期: ${invoiceInfo.invoiceDate || '未识别'}\n` + `金额: ${invoiceInfo.amount || '未识别'}\n` + `销售方: ${invoiceInfo.sellerName || '未识别'}\n` + `购买方: ${invoiceInfo.buyerName || '未识别'}\n` + `税额: ${invoiceInfo.taxAmount || '未识别'}\n` + `总金额: ${invoiceInfo.totalAmount || '未识别'}\n` + `车牌号: ${invoiceInfo.carPlate || '未识别'}\n` + `识别时间: ${new Date().toLocaleString()}`;
    const blob = new Blob([resultText], {
      type: 'text/plain'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_result_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "下载成功",
      description: "识别结果已下载"
    });
  };
  // ✅ 修复：添加识别结果状态检查
  if (!recognitionResult) {
    return <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-gray-500">等待识别结果</CardTitle>
          <CardDescription>请先上传并识别发票图片</CardDescription>
        </CardHeader>
      </Card>;
  }

  // 检查识别结果状态
  if (recognitionResult.success === false || recognitionResult.code !== 200) {
    return <Card className="w-full border-red-200">
        <CardHeader>
          <CardTitle className="text-red-500">识别失败</CardTitle>
          <CardDescription>
            {recognitionResult.error || recognitionResult.message || '发票识别失败，请检查图片质量或重新上传'}
          </CardDescription>
        </CardHeader>
      </Card>;
  }
  const invoiceInfo = parseRecognitionResult();
  if (!invoiceInfo) {
    return <Card className="w-full border-orange-200">
        <CardHeader>
          <CardTitle className="text-orange-500">解析失败</CardTitle>
          <CardDescription>
            无法解析识别结果结构，请检查控制台日志查看详细信息
          </CardDescription>
        </CardHeader>
      </Card>;
  }
  return <div className="space-y-6">
      {/* 识别结果概览 */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle>发票识别结果</CardTitle>
            <Badge variant="secondary" className="text-sm">
              {recognitionResult.code === 200 ? '识别成功' : '识别失败'}
            </Badge>
          </div>
          <CardDescription>
            文件: {file?.name} | 大小: {file ? (file.size / 1024 / 1024).toFixed(2) + 'MB' : '未知'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">发票类型:</span>
                <span>{invoiceInfo.invoiceType || '未识别'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">发票代码:</span>
                <span>{invoiceInfo.invoiceCode || '未识别'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">发票号码:</span>
                <span>{invoiceInfo.invoiceNumber || '未识别'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">开票日期:</span>
                <span>{invoiceInfo.invoiceDate || '未识别'}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">金额:</span>
                <span>{invoiceInfo.amount || '未识别'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">税额:</span>
                <span>{invoiceInfo.taxAmount || '未识别'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">总金额:</span>
                <span>{invoiceInfo.totalAmount || '未识别'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">车牌号:</span>
                <span>{invoiceInfo.carPlate || '未识别'}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* 交易方信息 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">交易方信息</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">销售方:</span>
                <p className="text-sm">{invoiceInfo.sellerName || '未识别'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">购买方:</span>
                <p className="text-sm">{invoiceInfo.buyerName || '未识别'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 审核结果 */}
      {auditResult && <Card className={auditResult.status === '通过' ? 'border-green-200' : 'border-red-200'}>
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-2">
              {auditResult.status === '通过' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
              <CardTitle>审核结果</CardTitle>
            </div>
            <CardDescription>
              审核状态: <span className={auditResult.status === '通过' ? 'text-green-600' : 'text-red-600'}>
                {auditResult.status}
              </span>
            </CardDescription>
          </CardHeader>
          
          {auditResult.exceptions && auditResult.exceptions.length > 0 && <CardContent>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">异常信息:</h4>
                <ul className="text-sm text-red-600 space-y-1">
                  {auditResult.exceptions.map((exception, index) => <li key={index}>• {exception.reason || exception}</li>)}
                </ul>
              </div>
            </CardContent>}
        </Card>}

      {/* 操作按钮组 */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleUploadToCloud} disabled={isUploading} className="flex items-center space-x-2">
          <Upload className="h-4 w-4" />
          <span>{isUploading ? '上传中...' : '上传到云存储'}</span>
        </Button>
        
        <Button onClick={handleAuditInvoice} disabled={isAuditing} variant="outline" className="flex items-center space-x-2">
          <Clock className="h-4 w-4" />
          <span>{isAuditing ? '审核中...' : '执行审核'}</span>
        </Button>
        
        <Button onClick={handlePreviewFile} variant="outline" className="flex items-center space-x-2">
          <Eye className="h-4 w-4" />
          <span>预览文件</span>
        </Button>
        
        <Button onClick={handleDownloadResult} variant="outline" className="flex items-center space-x-2">
          <Download className="h-4 w-4" />
          <span>下载结果</span>
        </Button>
      </div>

      {/* 上传进度 */}
      {isUploading && <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>上传进度</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>}

      {/* 云存储信息 */}
      {cloudFileUrl && <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">云存储信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">文件地址:</span>
                <span className="text-blue-600 truncate max-w-[200px]">{cloudFileUrl}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">上传状态:</span>
                <Badge variant="outline" className="text-green-600">已上传</Badge>
              </div>
            </div>
          </CardContent>
        </Card>}
    </div>;
}