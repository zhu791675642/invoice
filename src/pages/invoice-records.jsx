// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, useToast, Input } from '@/components/ui';
// @ts-ignore;
import { FileText, Calendar, DollarSign, Building, Download, RefreshCw, Search, Filter } from 'lucide-react';

export default function InvoiceRecords(props) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const {
    toast
  } = useToast();

  // ✅ 修复：调用云函数而不是不存在的数据源
  const loadInvoices = async () => {
    setLoading(true);
    try {
      console.log('开始加载发票记录...');

      // 调用云函数的 list action
      const result = await window.$w.cloud.callFunction({
        name: 'textin-bill-recognition',
        data: {
          action: 'list',
          limit: 100
        }
      });
      console.log('云函数返回结果:', result);

      // 处理腾讯云包装格式
      let apiResponse = result;
      if (result.result && typeof result.result === 'object') {
        apiResponse = result.result;
      }
      if (apiResponse.success && apiResponse.items && Array.isArray(apiResponse.items)) {
        const realInvoices = apiResponse.items;
        console.log('发票数量:', realInvoices.length);
        console.log('发票数据:', realInvoices);

        // 根据筛选状态过滤数据
        let filteredInvoices = realInvoices;
        if (filterStatus === 'audit_failed') {
          filteredInvoices = realInvoices.filter(invoice => invoice.auditStatus === 'failed');
        } else if (filterStatus !== 'all') {
          filteredInvoices = realInvoices.filter(invoice => invoice.recognitionStatus === filterStatus);
        }
        setInvoices(filteredInvoices);
        toast({
          title: "数据加载成功",
          description: `共加载 ${filteredInvoices.length} 条发票记录${filterStatus === 'audit_failed' ? '（审核不通过）' : ''}`
        });
      } else {
        console.warn('云函数返回为空或无 items 字段');
        setInvoices([]);
        toast({
          title: "暂无数据",
          description: "当前没有发票识别记录"
        });
      }
    } catch (error) {
      console.error('加载发票记录失败:', error);
      toast({
        title: "数据加载失败",
        description: error.message || "请检查网络连接",
        variant: "destructive"
      });
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadInvoices();
  }, []);

  // 过滤和搜索功能
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = searchTerm === '' || invoice.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) || invoice.sellerName?.toLowerCase().includes(searchTerm.toLowerCase()) || invoice.invoiceCode?.includes(searchTerm) || invoice.invoiceNumber?.includes(searchTerm);
    const matchesFilter = filterStatus === 'all' || (filterStatus === 'audit_failed' ? invoice.auditStatus === 'failed' : invoice.recognitionStatus === filterStatus);
    return matchesSearch && matchesFilter;
  });

  // 导出数据到Excel
  const exportToExcel = () => {
    if (filteredInvoices.length === 0) {
      toast({
        title: "无数据可导出",
        description: "请先加载发票数据",
        variant: "destructive"
      });
      return;
    }
    try {
      const headers = ['序号', '文件名', '发票类型', '发票代码', '发票号码', '开票日期', '金额', '销售方名称', '识别状态', '审核状态', '识别时间'];
      const csvData = filteredInvoices.map((invoice, index) => [index + 1, invoice.fileName || '', invoice.invoiceType || '', invoice.invoiceCode || '', invoice.invoiceNumber || '', invoice.invoiceDate || '', invoice.amount || '', invoice.sellerName || '', invoice.recognitionStatus || '', invoice.auditStatus || '待审核', invoice.recognitionTime ? new Date(invoice.recognitionTime).toLocaleString('zh-CN') : '']);
      const csvContent = [headers.join(','), ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;'
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `发票记录_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "导出成功",
        description: `已导出 ${filteredInvoices.length} 条发票记录`
      });
    } catch (error) {
      toast({
        title: "导出失败",
        description: `导出过程中发生错误: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  // 格式化文件大小
  const formatFileSize = bytes => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化时间
  const formatTime = timestamp => {
    if (!timestamp) return '';
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toLocaleString('zh-CN');
    }
    return new Date(timestamp).toLocaleString('zh-CN');
  };
  return <div className="min-h-screen bg-gray-50 p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">发票记录管理</h1>
        <p className="text-gray-600 mt-2">管理已识别的发票记录，支持搜索、筛选和导出功能</p>
      </div>

      {/* 搜索和筛选区域 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>搜索与筛选</CardTitle>
          <CardDescription>根据文件名、销售方、发票代码等信息进行搜索</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input placeholder="搜索文件名、销售方、发票代码..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full">
                <option value="all">全部状态</option>
                <option value="completed">识别成功</option>
                <option value="failed">识别失败</option>
                <option value="audit_failed">审核不通过</option>
              </select>
            </div>
            <div>
              <Button onClick={loadInvoices} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
            </div>
            <div>
              <Button onClick={exportToExcel} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                导出Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 发票记录列表 */}
      {loading ? <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
            <p>加载中...</p>
          </CardContent>
        </Card> : <div className="space-y-4">
          {filteredInvoices.length === 0 ? <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900">
                  {searchTerm || filterStatus !== 'all' ? '没有找到匹配的发票记录' : '暂无发票记录'}
                </h3>
                <p className="text-gray-500">
                  {searchTerm || filterStatus !== 'all' ? '请尝试调整搜索条件或筛选状态' : '请先上传发票图片进行识别'}
                </p>
              </CardContent>
            </Card> : filteredInvoices.map(invoice => <Card key={invoice.id || invoice._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {invoice.fileName}
                    </CardTitle>
                    <Badge variant={invoice.recognitionStatus === 'completed' ? 'default' : 'destructive'}>
                      {invoice.recognitionStatus === 'completed' ? '✅ 成功' : '❌ 失败'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">类型</p>
                      <p className="font-medium">{invoice.invoiceType || '未识别'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">日期</p>
                      <p className="font-medium">{invoice.invoiceDate || '未识别'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">金额</p>
                      <p className="font-medium">¥{invoice.amount || '未识别'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">销售方</p>
                      <p className="font-medium">{invoice.seller || invoice.sellerName || '未知'}</p>
                    </div>
                  </div>

                  {invoice.invoiceCode && invoice.invoiceNumber && <div className="mb-4">
                      <p className="text-sm text-gray-500">发票代码: {invoice.invoiceCode} | 发票号码: {invoice.invoiceNumber}</p>
                    </div>}

                  {/* 审核结果 */}
                  {invoice.auditStatus && <div className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={invoice.auditStatus === 'failed' ? 'destructive' : 'default'}>
                          审核: {invoice.auditStatus === 'failed' ? '❌ 不通过' : '✅ 通过'}
                        </Badge>
                      </div>
                      {invoice.auditStatus === 'failed' && invoice.auditExceptions && <p className="text-sm text-red-600">异常原因: {invoice.auditExceptions}</p>}
                      {invoice.carPlate && <p className="text-sm text-gray-600">车牌号: {invoice.carPlate}</p>}
                    </div>}
                  
                  <div className="flex justify-between items-center text-sm text-gray-500 mt-4 pt-4 border-t">
                    <span>文件大小: {formatFileSize(invoice.fileSize || 0)}</span>
                    <span>识别时间: {formatTime(invoice.recognitionTime)}</span>
                    {invoice.auditTime && <span>审核时间: {formatTime(invoice.auditTime)}</span>}
                  </div>
                </CardContent>
              </Card>)}
        </div>}

      {/* 统计信息 */}
      {!loading && filteredInvoices.length > 0 && <div className="mt-4 text-center text-sm text-gray-500">
          共显示 {filteredInvoices.length} 条发票记录
        </div>}
    </div>;
}