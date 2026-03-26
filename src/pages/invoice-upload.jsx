// @ts-ignore;
import React, { useState, useRef } from 'react';
// @ts-ignore;
import { Button, Input, Card, CardContent, CardDescription, CardHeader, CardTitle, useToast, InvoiceResultDisplay } from '@/components/ui';
// @ts-ignore;
import { Upload, FileText, Download, X, Camera, Image, History } from 'lucide-react';

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

  /**
   * 导航到发票记录页面
   */
  const navigateToRecords = () => {
    // 使用微搭的路由导航
    if (props.$w && props.$w.router) {
      props.$w.router.push({
        name: 'invoice-records'
      });
    } else {
      // 备用方案：使用 window.location
      window.location.hash = '#/invoice-records';
    }
  };
  return <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题区域 */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">发票识别工具</h1>
              <p className="text-gray-600 mt-2">上传发票图片，自动识别并导出为 Excel 格式</p>
            </div>
            
            {/* ✅ 导航到历史记录按钮 */}
            <Button onClick={navigateToRecords} variant="outline" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              查看记录
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧上传区域 */}
          <div>
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
                {isMobile && <div className="space-y-4">
                    <MobileUpload onFilesSelected={handleFiles} />
                    <p className="text-sm text-gray-500 text-center">
                      或使用下方拖拽上传功能
                    </p>
                  </div>}

                {/* 拖拽上传区域 */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors" onClick={() => fileInputRef.current?.click()}>
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <p className="text-lg font-medium text-gray-900">点击选择文件或拖拽文件到此区域</p>
                    <p className="text-sm text-gray-500">
                      支持 JPG、PNG、BMP、GIF、WEBP 等格式
                    </p>
                    
                    <div className="flex gap-3 justify-center mt-4">
                      <Button onClick={e => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }} className="bg-blue-600 hover:bg-blue-700">
                        <Image className="w-4 h-4 mr-2" />
                        选择文件
                      </Button>
                      
                      {!isMobile && <Button onClick={e => {
                      e.stopPropagation();
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
                  </div>
                </div>

                {/* 隐藏的文件输入 */}
                <input type="file" ref={fileInputRef} multiple accept="image/*" onChange={handleFileSelect} className="hidden" />

                {/* 已选择文件列表 */}
                {selectedFiles.length > 0 && <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-gray-900">已选择文件 ({selectedFiles.length})</h3>
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedFiles.map((file, index) => <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{file.name}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>)}
                    </div>
                  </div>}

                {/* 识别按钮 */}
                <Button onClick={recognizeInvoices} disabled={selectedFiles.length === 0 || isProcessing} className="w-full">
                  {isProcessing ? <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {processingFile ? `识别中: ${processingFile}` : '识别中...'}
                    </> : <>
                      <FileText className="w-4 h-4 mr-2" />
                      开始识别发票
                    </>}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 右侧结果区域 */}
          <div>
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
              <CardContent className="space-y-4">
                {recognitionResults.length > 0 ? <>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        共识别 {recognitionResults.length} 张发票
                      </div>
                      <Button onClick={handleExportToExcel} variant="outline" className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        导出 Excel
                      </Button>
                    </div>

                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {recognitionResults.map((result, index) => {
                    // 确保传递给组件的数据格式正确
                    const displayData = {
                      ...result,
                      fileName: result.fileName || result.file?.name || `发票_${index + 1}`,
                      fileSize: result.fileSize || result.file?.size || 0,
                      fileType: result.fileType || result.file?.type || 'image/jpeg',
                      recognitionTime: result.recognitionTime || new Date().toISOString()
                    };
                    return <InvoiceResultDisplay key={index} data={displayData} />;
                  })}
                    </div>
                  </> : <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">暂无识别结果</p>
                    <p className="text-sm text-gray-400 mt-1">请先上传发票图片并点击识别按钮</p>
                  </div>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>;
}