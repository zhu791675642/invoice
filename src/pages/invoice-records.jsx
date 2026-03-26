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

  // ✅ 修复：正确加载发票记录
  const loadInvoices = async () => {
    setLoading(true);
    try {
      console.log('开始加载发票记录...');

      // 使用正确的数据源 API 调用方式
      const result = await props.$w.cloud.callDataSource({
        dataSourceName: 'invoice_records',
        methodName: 'wedaGetRecordsV2',
        params: {
          filter: {
            where: {
              $and: [{
                isMockData: {
                  $ne: true
                }
              }]
            }
          },
          select: {
            $master: true
          },
          orderBy: [{
            recognitionTime: 'desc'
          }],
          getCount: true,
          pageSize: 50,
          pageNumber: 1
        }
      });
      console.log('API 返回结果:', result);
      if (result && result.records) {
        // 过滤掉模拟数据，只显示真实识别的发票记录
        const realInvoices = result.records.filter(invoice => !invoice.isMockData);
        console.log('真实发票数量:', realInvoices.length);
        console.log('真实发票数据:', realInvoices);

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
        console.warn('API 返回为空或无 records 字段');
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
      const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
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
    return new Date(timestamp).toLocaleString('zh-CN');
  };
  return <div className="min-h-screen bg-gray-50 p-4">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">发票记录管理</h1>
        <p className="text-gray-600">管理已识别的发票记录，支持搜索、筛选和导出功能</p>
      </div>

      {/* 搜索和筛选区域 */}
      <div className="mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input placeholder="搜索文件名、销售方、发票代码..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              
              <div className="flex gap-2">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="all">全部状态</option>
                  <option value="success">识别成功</option>
                  <option value="failed">识别失败</option>
                  <option value="audit_failed">审核不通过</option>
                </select>
                
                <Button onClick={loadInvoices} variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  刷新
                </Button>
                
                <Button onClick={exportToExcel} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  导出Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 发票记录列表 */}
      {loading ? <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div> : <div className="space-y-4">
          {filteredInvoices.length === 0 ? <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm || filterStatus !== 'all' ? '没有找到匹配的发票记录' : '暂无发票记录'}
                </p>
              </CardContent>
            </Card> : filteredInvoices.map(invoice => <Card key={invoice._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {invoice.fileName}
                      <Badge variant={invoice.recognitionStatus === 'success' ? 'default' : 'destructive'}>
                        {invoice.recognitionStatus}
                      </Badge>
                    </CardTitle>
                    {invoice.isMockData && <Badge variant="secondary">模拟数据</Badge>}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    类型: {invoice.invoiceType || '未识别'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-500" />
                    日期: {invoice.invoiceDate || '未识别'}
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-yellow-500" />
                    金额: ¥{invoice.amount || '未识别'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-purple-500" />
                    销售方: {invoice.sellerName || '未知'}
                  </div>
                </div>

                {invoice.invoiceCode && invoice.invoiceNumber && <p className="text-sm text-gray-600">
                    发票代码: {invoice.invoiceCode} | 发票号码: {invoice.invoiceNumber}
                  </p>}

                {/* ✅ 修复：显示审核结果 */}
                {invoice.auditStatus && <div className="border-t pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={invoice.auditStatus === 'failed' ? 'destructive' : 'default'}>
                        审核: {invoice.auditStatus === 'failed' ? '❌ 不通过' : '✅ 通过'}
                      </Badge>
                    </div>
                    {invoice.auditStatus === 'failed' && invoice.auditExceptions && invoice.auditExceptions.length > 0 && <p className="text-sm text-red-600">异常原因: {invoice.auditExceptions.join('，')}</p>}
                    {invoice.carPlate && <p className="text-sm text-gray-600">车牌号: {invoice.carPlate}</p>}
                  </div>}
              </CardContent>
              
              <div className="px-6 pb-4 text-xs text-gray-500 border-t pt-3">
                <div className="flex justify-between">
                  <span>文件大小: {formatFileSize(invoice.fileSize || 0)}</span>
                  <span>识别时间: {formatTime(invoice.recognitionTime)}</span>
                  {invoice.auditTime && <span>审核时间: {formatTime(invoice.auditTime)}</span>}
                </div>
              </div>
            </Card>)}
        </div>}

      {/* 统计信息 */}
      {!loading && filteredInvoices.length > 0 && <div className="mt-4 text-center text-sm text-gray-500">
          共显示 {filteredInvoices.length} 条发票记录
        </div>}
    </div>;
}