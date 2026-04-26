/**
 * Chrome Extension - Unified Page
 * BIBI Cars Parser v4.0 — Automated VIN Search Agent
 * Единая страница для скачивания, настройки и мониторинга расширения
 */

import React, { useState } from 'react';
import { 
  Download, 
  CheckCircle, 
  Info, 
  ArrowRight,
  Browser,
  Lightning,
  Robot,
  Plugs,
  Eye,
  Copy,
  Check
} from '@phosphor-icons/react';
import { AgentHealthChip } from '../components/AgentHealthChip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

const ChromeExtensionPage = () => {
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/bibi-cars-extension.zip';
    link.download = 'bibi-cars-extension.zip';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Расширение загружено');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Скопировано');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Chrome Extension</h1>
          <p className="text-sm text-muted-foreground mt-1">
            BIBI Cars Parser v4.0 — Automated VIN Search Agent
          </p>
        </div>
        <AgentHealthChip />
      </div>

      <Tabs defaultValue="download" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="download">Скачать и установить</TabsTrigger>
          <TabsTrigger value="features">Возможности</TabsTrigger>
          <TabsTrigger value="troubleshooting">Устранение проблем</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 1: DOWNLOAD & INSTALL */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="download" className="space-y-6">
          {/* Download Card */}
          <Card data-testid="extension-download-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Browser size={24} weight="duotone" />
                    Chrome Extension v4.0
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Автоматический парсинг Copart через браузерный агент. Поддержка VIN Search, DOM Ingestion, и Cookie Sync.
                  </CardDescription>
                </div>
                <Button
                  onClick={handleDownload}
                  size="lg"
                  data-testid="download-extension-button"
                >
                  <Download className="mr-2" size={18} />
                  Скачать ZIP
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Installation Steps */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center text-xl font-bold">
                    1
                  </div>
                  <h3 className="font-semibold">Скачайте</h3>
                  <p className="text-sm text-muted-foreground">
                    Нажмите кнопку "Скачать ZIP" выше и распакуйте архив в любую папку
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center text-xl font-bold">
                    2
                  </div>
                  <h3 className="font-semibold">Установите</h3>
                  <p className="text-sm text-muted-foreground">
                    Откройте <code className="font-mono text-xs">chrome://extensions</code>, включите Developer Mode, нажмите "Load unpacked"
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center text-xl font-bold">
                    3
                  </div>
                  <h3 className="font-semibold">Готово</h3>
                  <p className="text-sm text-muted-foreground">
                    Расширение начнет работу автоматически. Проверьте статус выше (AgentHealthChip)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Setup Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Детальная инструкция по установке</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Откройте страницу расширений Chrome</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="px-3 py-1 bg-muted rounded text-sm font-mono">chrome://extensions</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('chrome://extensions')}
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Включите режим разработчика</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      В правом верхнем углу найдите переключатель "Developer mode" и включите его
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Загрузите распакованное расширение</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Нажмите "Load unpacked" и выберите папку с распакованным расширением
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Убедитесь что расширение активно</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Проверьте что переключатель расширения включен, и AgentHealthChip выше показывает "Агент активен"
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <Alert>
            <Info size={18} />
            <AlertDescription>
              <strong>Важно:</strong> Для работы Automated VIN Search вы должны быть залогинены на{' '}
              <code className="font-mono text-xs">copart.com</code> в том же браузере где установлено расширение.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 2: FEATURES */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="features" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Feature 1: Automated VIN Search */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Robot size={20} weight="duotone" className="text-primary" />
                  </div>
                  <CardTitle className="text-lg">Automated VIN Search</CardTitle>
                </div>
                <CardDescription>
                  Автоматический поиск VIN на Copart через браузерный агент
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                  <p className="text-sm">Polling задач из backend каждые 5 секунд</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                  <p className="text-sm">Автоматическое открытие Copart и ввод VIN</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                  <p className="text-sm">DOM парсинг данных лота (images, specs, damage)</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                  <p className="text-sm">Поддержка урезанных VIN (6-16 символов) и полных VIN (17 символов)</p>
                </div>
                <Separator className="my-3" />
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href="/admin/vin-automated">
                    Перейти к VIN Search
                    <ArrowRight className="ml-2" size={14} />
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Feature 2: DOM Ingestion */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Eye size={20} weight="duotone" className="text-blue-500" />
                  </div>
                  <CardTitle className="text-lg">Manual DOM Ingestion</CardTitle>
                </div>
                <CardDescription>
                  Ручной парсинг лотов прямо со страницы Copart
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                  <p className="text-sm">Парсинг активной вкладки Copart lot page</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                  <p className="text-sm">Автоматическая отправка данных в CRM</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                  <p className="text-sm">Dedupe защита (не отправляет дубликаты)</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                  <p className="text-sm">Badge индикация успеха/ошибки</p>
                </div>
              </CardContent>
            </Card>

            {/* Feature 3: Cookie Sync */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <Plugs size={20} weight="duotone" className="text-purple-500" />
                  </div>
                  <CardTitle className="text-lg">Cookie Synchronization</CardTitle>
                </div>
                <CardDescription>
                  Автоматическая синхронизация сессий с bid.cars и Copart
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                  <p className="text-sm">Автоматическая отправка cookies в backend</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                  <p className="text-sm">Поддержка bid.cars, carfast.express</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                  <p className="text-sm">Нет необходимости ручного копирования сессий</p>
                </div>
              </CardContent>
            </Card>

            {/* Feature 4: Health Monitoring */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Lightning size={20} weight="duotone" className="text-green-500" />
                  </div>
                  <CardTitle className="text-lg">Agent Health Monitoring</CardTitle>
                </div>
                <CardDescription>
                  Мониторинг состояния расширения в реальном времени
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                  <p className="text-sm">Heartbeat каждые 12 секунд</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                  <p className="text-sm">Индикатор "Агент активен" / "Агент не отвечает"</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                  <p className="text-sm">Timestamp последнего heartbeat</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 3: TROUBLESHOOTING */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="troubleshooting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Распространенные проблемы и решения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Problem 1 */}
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600">❌ AgentHealthChip показывает "Агент не отвечает"</h4>
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <p className="text-sm"><strong>Причина:</strong> Расширение не установлено, отключено, или произошла ошибка</p>
                  <p className="text-sm"><strong>Решение:</strong></p>
                  <ol className="list-decimal list-inside text-sm space-y-1 pl-2">
                    <li>Откройте <code className="font-mono">chrome://extensions</code></li>
                    <li>Убедитесь что "BIBI Cars Parser" присутствует в списке</li>
                    <li>Проверьте что переключатель расширения включен (синий)</li>
                    <li>Если есть ошибки - нажмите "Reload" на карточке расширения</li>
                    <li>Обновите страницу CRM и подождите 15 секунд</li>
                  </ol>
                </div>
              </div>

              <Separator />

              {/* Problem 2 */}
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600">❌ VIN Search остается в статусе "В очереди" или "Поиск"</h4>
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <p className="text-sm"><strong>Причина:</strong> Расширение не забирает задачи из очереди</p>
                  <p className="text-sm"><strong>Решение:</strong></p>
                  <ol className="list-decimal list-inside text-sm space-y-1 pl-2">
                    <li>Проверьте AgentHealthChip - должен быть зелёный</li>
                    <li>Откройте DevTools расширения (chrome://extensions → Details → Inspect views: service worker)</li>
                    <li>Проверьте Console на ошибки</li>
                    <li>Если видите ошибки fetch/network - проверьте доступность backend</li>
                    <li>Перезагрузите расширение через chrome://extensions</li>
                  </ol>
                </div>
              </div>

              <Separator />

              {/* Problem 3 */}
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600">❌ Поиск возвращает статус "FAILED"</h4>
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <p className="text-sm"><strong>Причина:</strong> Ошибка при парсинге Copart (селекторы изменились, не залогинены, и т.д.)</p>
                  <p className="text-sm"><strong>Решение:</strong></p>
                  <ol className="list-decimal list-inside text-sm space-y-1 pl-2">
                    <li>Убедитесь что вы залогинены на copart.com</li>
                    <li>Попробуйте вручную открыть copart.com/vehicleFinderSearch и ввести VIN</li>
                    <li>Если вручную работает - проверьте Console расширения на ошибки селекторов</li>
                    <li>Если Copart изменил структуру DOM - нужно обновить селекторы в content_copart_search.js</li>
                  </ol>
                </div>
              </div>

              <Separator />

              {/* Problem 4 */}
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600">❌ Manual DOM Ingestion не работает</h4>
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <p className="text-sm"><strong>Причина:</strong> Content script не инжектируется на странице лота</p>
                  <p className="text-sm"><strong>Решение:</strong></p>
                  <ol className="list-decimal list-inside text-sm space-y-1 pl-2">
                    <li>Убедитесь что вы на странице лота (URL содержит /lot/)</li>
                    <li>Перезагрузите страницу (F5)</li>
                    <li>Откройте Console браузера и проверьте наличие сообщений от "[BIBI Copart]"</li>
                    <li>Если сообщений нет - проверьте manifest.json content_scripts permissions</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Debug Console */}
          <Card>
            <CardHeader>
              <CardTitle>Доступ к Debug Console расширения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Для просмотра логов и отладки расширения:
              </p>
              <ol className="list-decimal list-inside space-y-2 pl-2">
                <li className="text-sm">
                  Откройте <code className="font-mono text-xs">chrome://extensions</code>
                </li>
                <li className="text-sm">
                  Найдите "BIBI Cars Parser"
                </li>
                <li className="text-sm">
                  Нажмите "Details"
                </li>
                <li className="text-sm">
                  Найдите "Inspect views: <strong>service worker</strong>" и нажмите на ссылку
                </li>
                <li className="text-sm">
                  Откроется DevTools с Console где видны все логи polling, heartbeat, task execution
                </li>
              </ol>

              <Alert>
                <Info size={18} />
                <AlertDescription>
                  <strong>Полезные логи:</strong>
                  <ul className="list-disc list-inside mt-2 text-xs space-y-1">
                    <li><code>[AGENT] New task received</code> - Задача получена</li>
                    <li><code>[AGENT] Executing search for VIN</code> - Начало поиска</li>
                    <li><code>[AGENT] Result submitted: FOUND</code> - Результат отправлен</li>
                    <li><code>[AGENT] ❤️ Heartbeat sent</code> - Heartbeat отправлен</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChromeExtensionPage;
