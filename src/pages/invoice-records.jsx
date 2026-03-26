// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, useToast, Input } from '@/components/ui';
// @ts-ignore;
import { FileText, Calendar, DollarSign, Building, Download, RefreshCw, Search, Filter, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

import { invoiceAuditFlow, getAuditStatusColor } from '@/lib/audit-utils';
export default function InvoiceRecords(props) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const {
    toast
  } = useToast();

  // ✅ 调用云函数加载发票记录
  const loadInvoices = async () => {
    setLoading(true);
    try {
      console.log('开始加载发票记录...');
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

        // ✅ 对每张发票执行审核
        const invoicesWithAudit = realInvoices.map(invoice => {
          const auditData = [{
            invoiceNumber: invoice.invoiceNumber || '',
            invoiceDate: invoice.invoiceDate || '',
            carPlate: invoice.carPlate || '',
            hasSeal1: invoice.supervisoryStamp === 'True' || invoice.supervisoryStamp === true,
            hasSeal2: invoice.invoiceStamp === 'True' || invoice.invoiceStamp === true
          }];
          try {
            const auditResult = invoiceAuditFlow(auditData);
            return {
              ...invoice,
              auditStatus: auditResult.status,
              auditExceptions: auditResult.exceptions,
              auditSummary: auditResult.summary
            };
          } catch (error) {
            console.error('审核失败:', error);
            return {
              ...invoice,
              auditStatus: 'error',
              auditExceptions: [{
                type: '异常',
                reason: '审核异常'
              }],
              auditSummary: '审核过程出错'
            };
          }
        });

        // 根据筛选状态过滤数据
        let filteredInvoices = invoicesWithAudit;
        if (filterStatus === 'passed') {
          filteredInvoices = invoicesWithAudit.filter(invoice => invoice.auditStatus === '审核通过');
        } else if (filterStatus === 'warning') {
          filteredInvoices = invoicesWithAudit.filter(invoice => invoice.auditStatus === '需人工复核');
        } else if (filterStatus === 'failed') {
          filteredInvoices = invoicesWithAudit.filter(invoice => invoice.auditStatus === '审核不通过');
        }
        setInvoices(filteredInvoices);
        toast({
          title: "数据加载成功",
          description: `共加载 ${filteredInvoices.length} 条发票记录`
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
    const matchesSearch = searchTerm === '' || invoice.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) || invoice.invoiceNumber?.includes(searchTerm) || invoice.carPlate?.includes(searchTerm);
    const matchesFilter = filterStatus === 'all' || filterStatus === 'passed' && invoice.auditStatus === '审核通过' || filterStatus === 'warning' && invoice.auditStatus === '需人工复核' || filterStatus === 'failed' && invoice.auditStatus === '审核不通过';
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
      const headers = ['序号', '文件名', '发票类型', '发票代码', '发票号码', '开票日期', '金额', '车牌号', '上车时间', '下车时间', '里程', '审核状态', '审核结果'];
      const csvData = filteredInvoices.map((invoice, index) => [index + 1, invoice.fileName || '', invoice.invoiceType || '', invoice.invoiceCode || '', invoice.invoiceNumber || '', invoice.invoiceDate || '', invoice.amount || '', invoice.carPlate || '', invoice.boardingTime || '', invoice.landingTime || '', invoice.mileage || '', invoice.auditStatus || '', invoice.auditSummary || '']);
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

  // 获取审核状态图标
  const getAuditIcon = status => {
    switch (status) {
      case '审核通过':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case '需人工复核':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case '审核不通过':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };
  return <div className="min-h-screen bg-gray-50 p-6">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">发票记录管理</h1>
        <p className="text-gray-600 mt-2">管理已识别的发票记录，支持搜索、筛选、审核和导出功能</p>
      </div>

      {/* 搜索和筛选区域 */}
      <div className="mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input placeholder="搜索文件名、发票号、车牌号..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              
              <div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full">
                  <option value="all">全部状态</option>
                  <option value="passed">✅ 审核通过</option>
                  <option value="warning">⚠️ 需人工复核</option>
                  <option value="failed">❌ 审核不通过</option>
                </select>
              </div>
              
              <div>
                <Button onClick={loadInvoices} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新
                </Button>
              </div>
              
              <div>
                <Button onClick={exportToExcel} className="w-full bg-green-600 hover:bg-green-700">
                  <Download className="h-4 w-4 mr-2" />
                  导出Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 发票记录列表 */}
      {loading ? <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div> : <div className="space-y-4">
          {filteredInvoices.length === 0 ? <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm || filterStatus !== 'all' ? '没有找到匹配的发票记录' : '暂无发票记录'}
                </p>
              </CardContent>
            </Card> : filteredInvoices.map(invoice => <Card key={invoice.id || invoice.fileName} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{invoice.fileName}</CardTitle>
                      <CardDescription className="mt-1">
                        <Badge variant="secondary" className="mr-2">
                          {invoice.invoiceType || '未识别'}
                        </Badge>
                      </CardDescription>
                      <CardDescription className="mt-1">
                        发票号: {invoice.invoiceNumber || '未识别'} | 日期: {invoice.invoiceDate || '未识别'}
                      </CardDescription>
                    </div>
                    
                    {/* 审核状态徽章 */}
                    <Badge variant={getAuditStatusColor(invoice.auditStatus)} className="flex items-center gap-1">
                      {getAuditIcon(invoice.auditStatus)}
                      <span>
                        {invoice.auditStatus || '未审核'}
                      </span>
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* 发票基本信息 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">发票代码</p>
                      <p className="font-medium">{invoice.invoiceCode || '未识别'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">金额</p>
                      <p className="font-medium">¥{invoice.amount || '0'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">车牌号</p>
                      <p className="font-medium">{invoice.carPlate || '未识别'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">地点</p>
                      <p className="font-medium">{invoice.invoiceLocation || '未识别'}</p>
                    </div>
                  </div>

                  {/* 出租车特有信息 */}
                  {invoice.boardingTime && <div>
                      <p className="text-sm text-gray-500 mb-2">出行信息</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">上车: {invoice.boardingTime}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">下车: {invoice.landingTime}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">里程: {invoice.mileage}</p>
                        </div>
                      </div>
                    </div>}

                  {/* 印章信息 */}
                  <div className="flex gap-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        {invoice.supervisoryStamp === 'True' ? '✅' : '❌'} 监制章
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">
                        {invoice.invoiceStamp === 'True' ? '✅' : '❌'} 发票章
                      </p>
                    </div>
                  </div>

                  {/* 审核结果 */}
                  {invoice.auditExceptions && invoice.auditExceptions.length > 0 && <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium mb-2">审核详情: {invoice.auditSummary}</p>
                      <div className="space-y-1">
                        {invoice.auditExceptions.map((exception, idx) => <p key={idx} className="text-xs text-gray-600">
                            {exception.type === '异常' ? '❌' : '⚠️'}
                            {exception.reason}
                          </p>)}
                      </div>
                    </div>}
                </CardContent>
                
                <div className="px-6 py-3 bg-gray-50 border-t">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>文件大小: {formatFileSize(invoice.fileSize || 0)}</span>
                    <span>识别时间: {formatTime(invoice.recognitionTime)}</span>
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