/**
 * Automated VIN Search Page
 * Автоматизированный поиск VIN через Chrome Extension Agent
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckCircle, XCircle, AlertCircle, Clock, ExternalLink, Copy, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuth, API_URL } from '../App';
import { AgentHealthChip } from '../components/AgentHealthChip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';

const AutomatedVinSearch = () => {
  const { user } = useAuth();
  const [vin, setVin] = useState('');
  const [searchId, setSearchId] = useState(null);
  const [searchStatus, setSearchStatus] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [vinError, setVinError] = useState('');
  const pollingInterval = useRef(null);

  // Status configuration
  const statusConfig = {
    PENDING: {
      label: 'В очереди',
      message: 'Задача в очереди…',
      progress: 10,
      color: 'bg-secondary text-secondary-foreground',
      dotColor: 'bg-zinc-400',
      Icon: Clock
    },
    IN_PROGRESS: {
      label: 'Поиск',
      message: '🔍 Ищем на Copart… ⏳ Обычно занимает 5–10 секунд',
      progress: 55,
      color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      dotColor: 'bg-blue-500',
      Icon: Loader2,
      animated: true
    },
    FOUND: {
      label: 'Найдено',
      message: 'Найдено',
      progress: 100,
      color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      dotColor: 'bg-green-500',
      Icon: CheckCircle
    },
    NOT_FOUND: {
      label: 'Не найдено',
      message: 'Не найдено на Copart',
      progress: 100,
      color: 'bg-muted text-muted-foreground',
      dotColor: 'bg-zinc-400',
      Icon: XCircle
    },
    FAILED: {
      label: 'Ошибка',
      message: 'Ошибка поиска',
      progress: 100,
      color: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      dotColor: 'bg-red-500',
      Icon: AlertCircle
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  // Start status polling
  const startPolling = (id) => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    pollingInterval.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/api/vin/status/${id}`);
        setSearchStatus(res.data);

        // Stop polling if final status
        if (['FOUND', 'NOT_FOUND', 'FAILED'].includes(res.data.status)) {
          clearInterval(pollingInterval.current);
          setIsSearching(false);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds
  };

  // Validate VIN
  const validateVin = (value) => {
    const cleanValue = value.toUpperCase().replace(/[^A-Z0-9*]/g, '');
    const vinClean = cleanValue.replace(/\*/g, '');

    if (vinClean.length < 6) {
      setVinError('VIN должен быть минимум 6 символов (без *)');
      return false;
    }

    if (cleanValue.length > 17) {
      setVinError('VIN не может превышать 17 символов');
      return false;
    }

    setVinError('');
    return true;
  };

  // Handle VIN input
  const handleVinChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9*]/g, '');
    setVin(value);
    if (value) {
      validateVin(value);
    } else {
      setVinError('');
    }
  };

  // Submit search
  const handleSearch = async () => {
    if (!validateVin(vin)) {
      return;
    }

    try {
      setIsSearching(true);
      const res = await axios.post(`${API_URL}/api/vin/search`, { vin });
      setSearchId(res.data.searchId);
      setSearchStatus({
        searchId: res.data.searchId,
        status: res.data.status,
        vin: res.data.vin,
        vinPartial: res.data.vinPartial
      });
      startPolling(res.data.searchId);
      toast.success('Поиск запущен');
    } catch (error) {
      console.error('Search error:', error);
      toast.error(error.response?.data?.detail || 'Ошибка запуска поиска');
      setIsSearching(false);
    }
  };

  // Copy VIN to clipboard
  const copyVin = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('VIN скопирован');
  };

  const currentStatus = searchStatus ? statusConfig[searchStatus.status] : null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Поиск VIN на Copart</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Автоматический поиск через Chrome Extension
          </p>
        </div>
        <AgentHealthChip />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column: Search Form */}
        <Card data-testid="vin-search-card">
          <CardHeader>
            <CardTitle>Введите VIN</CardTitle>
            <CardDescription>
              Поддерживаются полные и частичные VIN с символом *
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vin-input">
                VIN {searchStatus?.vinPartial && <span className="text-xs text-muted-foreground">(урезанный)</span>}
              </Label>
              <Input
                id="vin-input"
                data-testid="vin-search-input"
                placeholder="Полный (17 симв.) или урезанный VIN (6-16 симв.)"
                value={vin}
                onChange={handleVinChange}
                maxLength={17}
                className="font-mono text-lg"
                disabled={isSearching}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              {vinError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertDescription className="text-xs">{vinError}</AlertDescription>
                </Alert>
              )}
            </div>

            <div data-testid="vin-search-helper-text" className="text-xs text-muted-foreground space-y-1">
              <p>Примеры:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Полный VIN (17): <code className="font-mono">1HGBH41JXMN109186</code></li>
                <li>Урезанный (11): <code className="font-mono">5N1AR2MM3FC</code></li>
                <li>С wildcards: <code className="font-mono">5UXTA6C08M9******</code></li>
              </ul>
            </div>

            <Button
              data-testid="vin-search-submit-button"
              onClick={handleSearch}
              disabled={!vin || !!vinError || isSearching}
              className="w-full"
              size="lg"
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Поиск...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Найти на Copart
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Right Column: Status Panel */}
        {searchStatus && (
          <Card data-testid="vin-search-status-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Статус поиска
                {currentStatus && (
                  <Badge data-testid="vin-search-status-badge" className={currentStatus.color}>
                    <span className={`inline-flex h-2 w-2 rounded-full mr-1.5 ${currentStatus.dotColor}`}></span>
                    {currentStatus.label}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p data-testid="vin-search-status-message" className="text-sm font-medium">
                  {currentStatus?.message}
                </p>
                {['PENDING', 'IN_PROGRESS'].includes(searchStatus.status) && (
                  <Progress data-testid="vin-search-progress" value={currentStatus?.progress} className="h-2" />
                )}
              </div>

              <Separator />

              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <strong>VIN:</strong> <code className="font-mono">{searchStatus.vin}</code>
                </p>
                {searchStatus.updatedAt && (
                  <p data-testid="vin-search-last-updated">
                    <strong>Последнее обновление:</strong>{' '}
                    {new Date(searchStatus.updatedAt).toLocaleString('ru-RU')}
                  </p>
                )}
              </div>

              {searchStatus.errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{searchStatus.errorMessage}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Result Card */}
      {searchStatus?.status === 'FOUND' && searchStatus.vehicleData && (
        <Card data-testid="vin-search-result-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="text-green-500" />
              Результат поиска
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Image */}
              {searchStatus.vehicleData.images?.[0] && (
                <div className="rounded-lg overflow-hidden bg-muted">
                  <img
                    src={searchStatus.vehicleData.images[0]}
                    alt={searchStatus.vehicleData.title}
                    className="w-full h-auto"
                  />
                </div>
              )}

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{searchStatus.vehicleData.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchStatus.vehicleData.year} {searchStatus.vehicleData.make} {searchStatus.vehicleData.model}
                  </p>
                </div>

                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Номер лота</dt>
                    <dd className="font-mono">{searchStatus.vehicleData.lotNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">VIN</dt>
                    <dd className="font-mono">{searchStatus.vehicleData.vin}</dd>
                  </div>
                  {searchStatus.vehicleData.odometer && (
                    <div>
                      <dt className="text-muted-foreground">Пробег</dt>
                      <dd>{searchStatus.vehicleData.odometer}</dd>
                    </div>
                  )}
                  {searchStatus.vehicleData.primaryDamage && (
                    <div>
                      <dt className="text-muted-foreground">Повреждение</dt>
                      <dd>{searchStatus.vehicleData.primaryDamage}</dd>
                    </div>
                  )}
                  {searchStatus.vehicleData.location && (
                    <div>
                      <dt className="text-muted-foreground">Местоположение</dt>
                      <dd>{searchStatus.vehicleData.location}</dd>
                    </div>
                  )}
                  {searchStatus.vehicleData.saleDate && (
                    <div>
                      <dt className="text-muted-foreground">Дата продажи</dt>
                      <dd>{searchStatus.vehicleData.saleDate}</dd>
                    </div>
                  )}
                </dl>

                <div className="flex gap-2 pt-2">
                  {searchStatus.vehicleData.sourceUrl && (
                    <Button
                      data-testid="vin-search-open-copart-link"
                      variant="default"
                      size="sm"
                      onClick={() => window.open(searchStatus.vehicleData.sourceUrl, '_blank')}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Открыть на Copart
                    </Button>
                  )}
                  <Button
                    data-testid="vin-search-copy-vin-button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyVin(searchStatus.vehicleData.vin)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Скопировать VIN
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {searchStatus?.status === 'NOT_FOUND' && (
        <Card data-testid="vin-search-empty-state">
          <CardContent className="py-12 text-center">
            <XCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Лот не найден</h3>
            <p className="text-sm text-muted-foreground mb-4">
              VIN <code className="font-mono">{searchStatus.vin}</code> не найден на Copart
            </p>
            <Button variant="outline" onClick={() => { setVin(''); setSearchStatus(null); setSearchId(null); }}>
              Попробовать другой VIN
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AutomatedVinSearch;
