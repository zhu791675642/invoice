// @ts-ignore;
import React from 'react';
// @ts-ignore;
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
// @ts-ignore;
import { FileText, Upload, Download, CheckCircle, Database, ShieldCheck } from 'lucide-react';

export default function Home(props) {
  const navigateToInvoiceUpload = () => {
    props.$w.utils.navigateTo({
      pageId: 'invoice-upload',
      params: {}
    });
  };
  const navigateToInvoiceRecords = () => {
    props.$w.utils.navigateTo({
      pageId: 'invoice-records',
      params: {}
    });
  };
  const navigateToInvoiceAudit = () => {
    props.$w.utils.navigateTo({
      pageId: 'invoice-audit',
      params: {}
    });
  };
  return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">发票识别工具</h1>
          <p className="text-xl text-gray-600 mb-8">
            专业发票识别，一键导出Excel，让财务工作更高效
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg" onClick={navigateToInvoiceUpload}>
              <Upload className="h-5 w-5 mr-2" />
              开始识别发票
            </Button>
            <Button size="lg" variant="outline" className="border-gray-300 text-gray-700 px-8 py-3 text-lg" onClick={navigateToInvoiceRecords}>
              <Database className="h-5 w-5 mr-2" />
              查看记录管理
            </Button>
            <Button size="lg" variant="outline" className="border-green-300 text-green-700 px-8 py-3 text-lg" onClick={navigateToInvoiceAudit}>
              <ShieldCheck className="h-5 w-5 mr-2" />
              发票审核
            </Button>
          </div>
        </div>

        {/* 功能特性 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>多格式支持</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                支持 JPG、PNG、BMP、GIF 等多种图片格式，单次可批量上传多张发票
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>智能识别</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                基于先进的OCR技术，准确识别发票代码、号码、金额等关键信息
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-full">
                  <Download className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>一键导出</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                识别结果可直接导出为Excel格式，方便后续数据处理和分析
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* 使用流程 */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-center">三步完成发票识别</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                  1
                </div>
                <h3 className="font-semibold mb-2">上传发票</h3>
                <p className="text-gray-600 text-sm">选择要识别的发票图片文件</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                  2
                </div>
                <h3 className="font-semibold mb-2">智能识别</h3>
                <p className="text-gray-600 text-sm">系统自动识别发票关键信息</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                  3
                </div>
                <h3 className="font-semibold mb-2">导出结果</h3>
                <p className="text-gray-600 text-sm">下载Excel格式的识别结果</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 底部行动按钮 */}
        <div className="text-center mt-12">
          <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-12 py-4 text-lg" onClick={navigateToInvoiceUpload}>
            <FileText className="h-5 w-5 mr-2" />
            立即体验
          </Button>
        </div>
      </div>
    </div>;
}