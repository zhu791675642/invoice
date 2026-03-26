// @ts-ignore;
import React, { useState, useRef } from 'react';
// @ts-ignore;
import { Button, Input, Card, CardContent, CardDescription, CardHeader, CardTitle, useToast, InvoiceResultDisplay } from '@/components/ui';
// @ts-ignore;
import { Upload, FileText, Download, X, Camera, Image } from 'lucide-react';

import { useInvoiceRecognizer } from '@/components/InvoiceRecognizer';
import MobileUpload from '@/components/MobileUpload';

/**
 * 检查是否是移动设备
 */
function isMobileDevice() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const mobileKeywords = ['Android', 'iPhone', 'iPad', 'iPod', 'BlackBerry', 'Windows Phone', 'Mobile', 'webOS', 'Opera Mini', 'IEMobile', 'Kindle'];
  const isMobile = mobileKeywords.some(keyword => userAgent.toLowerCase().includes(keyword.toLowerCase()));
  const isSmallScreen = window.innerWidth <= 768;
  return isMobile || isSmallScreen;
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 验证图片文件
 */
function validateImageFile(file) {
  const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/gif', 'image/webp'];
  if (!supportedFormats.includes(file.type)) {
    return {
      isValid: false,
      message: '不支持的文件格式，请上传 JPG、PNG、BMP、GIF 或 WEBP 格式的图片'
    };
  }
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      isValid: false,
      message: '文件大小超过限制，最大支持 50MB'
    };
  }
  const minSize = 1024;
  if (file.size < minSize) {
    return {
      isValid: false,
      message: '文件大小过小，可能不是有效的图片文件'
    };
  }
  return {
    isValid: true,
    message: '文件验证通过'
  };
}
export default function InvoiceUpload(props) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [recognitionResults, setRecognitionResults] = useState([]);
  const [processingFile, setProcessingFile] = useState(null);
  const fileInputRef = useRef(null);
  const {
    toast
  } = useToast();
  const {
    recognizeInvoice,
    exportToExcel,
    isProcessing
  } = useInvoiceRecognizer();

  /**
   * 处理文件选择
   */
  const handleFileSelect = event => {
    const files = Array.from(event.target.files);
    handleFiles(files);
  };

  /**
   * 处理文件列表
   */
  const handleFiles = files => {
    const validFiles = [];
    files.forEach(file => {
      const validation = validateImageFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        toast({
          title: '文件验证失败',
          description: `${file.name}: ${validation.message}`,
          variant: 'destructive'
        });
      }
    });
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  /**
   * 移除文件
   */
  const removeFile = index => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * 执行发票识别
   */
  const recognizeInvoices = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: '请选择文件',
        description: '请先选择要识别的发票图片',
        variant: 'destructive'
      });
      return;
    }
    const results = [];
    let successCount = 0;
    let failCount = 0;
    try {
      for (const file of selectedFiles) {
        try {
          setProcessingFile(file.name);
          console.log(`开始处理文件: ${file.name}`);

          // 调用云函数进行识别
          const recognitionData = await recognizeInvoice(file, {
            coord_restore: 0,
            crop_complete_image: 0,
            crop_value_image: 0,
            verify_vat: 0
          });
          results.push({
            fileName: file.name,
            result: recognitionData.result,
            timestamp: new Date().toISOString(),
            isMock: false,
            success: true
          });
          successCount++;
          toast({
            title: '识别成功',
            description: `文件 ${file.name} 已成功识别`
          });
        } catch (error) {
          console.error(`处理文件 ${file.name} 时出错:`, error);
          results.push({
            fileName: file.name,
            result: null,
            error: error.message,
            timestamp: new Date().toISOString(),
            isMock: false,
            success: false
          });
          failCount++;
          toast({
            title: '识别失败',
            description: `文件 ${file.name} 识别失败: ${error.message}`,
            variant: 'destructive'
          });
        }
      }
      setRecognitionResults(results);
      setProcessingFile(null);
      toast({
        title: '识别完成',
        description: `成功: ${successCount} | 失败: ${failCount}`
      });
    } catch (error) {
      console.error('处理过程中出现错误:', error);
      toast({
        title: '处理失败',
        description: error.message || '请检查网络连接',
        variant: 'destructive'
      });
    }
  };

  /**
   * 导出为 Excel
   */
  const handleExportToExcel = () => {
    const validResults = recognitionResults.filter(r => r.success && r.result);
    if (validResults.length === 0) {
      toast({
        title: '无有效数据',
        description: '没有成功识别的发票可以导出',
        variant: 'destructive'
      });
      return;
    }
    exportToExcel(validResults);
  };

  // 检查是否是移动设备
  const isMobile = isMobileDevice();
  return <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>发票识别工具</CardTitle>
            <CardDescription>上传发票图片，自动识别并导出为 Excel 格式</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧上传区域 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                上传发票图片
              </CardTitle>
              <CardDescription>
                支持 JPG、PNG、BMP、GIF、WEBP 等格式，单次最多上传 10 张图片
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 移动端专用上传组件 */}
              {isMobile && <div className="space-y-2">
                  <MobileUpload onFilesSelected={handleFiles} />
                  <p className="text-sm text-gray-500 text-center">
                    或使用下方拖拽上传功能
                  </p>
                </div>}

              {/* 拖拽上传区域 */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <Image className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">点击选择文件或拖拽文件到此区域</p>
                <p className="text-sm text-gray-500 mb-4">
                  支持 JPG、PNG、BMP、GIF、WEBP 等格式
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700">
                    <Upload className="w-4 h-4 mr-2" />
                    选择文件
                  </Button>
                  {!isMobile && <Button onClick={() => {
                  const cameraInput = document.createElement('input');
                  cameraInput.type = 'file';
                  cameraInput.accept = 'image/*';
                  cameraInput.capture = 'environment';
                  cameraInput.onchange = e => handleFileSelect(e);
                  cameraInput.click();
                }} className="bg-green-600 hover:bg-green-700">
                      <Camera className="w-4 h-4 mr-2" />
                      拍照上传
                    </Button>}
                </div>
                <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
              </div>

              {/* 已选择文件列表 */}
              {selectedFiles.length > 0 && <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      已选择文件 ({selectedFiles.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedFiles.map((file, index) => <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>)}
                  </CardContent>
                </Card>}

              {/* 识别按钮 */}
              <Button onClick={recognizeInvoices} disabled={selectedFiles.length === 0 || isProcessing} className="w-full">
                {isProcessing ? <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {processingFile ? `识别中: ${processingFile}` : '识别中...'}
                  </> : <><FileText className="w-4 h-4 mr-2" />开始识别发票</>}
              </Button>
            </CardContent>
          </Card>

          {/* 右侧结果区域 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                识别结果
              </CardTitle>
              <CardDescription>
                {recognitionResults.length > 0 ? `已识别 ${recognitionResults.length} 张发票` : '识别结果将显示在这里'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recognitionResults.length > 0 ? <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      共识别 {recognitionResults.length} 张发票
                    </span>
                    <Button onClick={handleExportToExcel}>
                      <Download className="w-4 h-4 mr-2" />
                      导出 Excel
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {recognitionResults.map((result, index) => {
                  // 确保传递给组件的数据格式正确
                  const displayData = {
                    ...result,
                    fileName: result.fileName || result.file?.name || `发票_${index + 1}`,
                    fileSize: result.fileSize || result.file?.size || 0,
                    fileType: result.fileType || result.file?.type || 'image/jpeg',
                    recognitionTime: result.recognitionTime || new Date().toISOString()
                  };
                  return <InvoiceResultDisplay key={index} recognitionResult={displayData} file={result.file || {
                    name: displayData.fileName,
                    size: displayData.fileSize,
                    type: displayData.fileType
                  }} />;
                })}
                  </div>
                </div> : <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 mb-2">暂无识别结果</p>
                  <p className="text-sm text-gray-400">请先上传发票图片并点击识别按钮</p>
                </div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
}