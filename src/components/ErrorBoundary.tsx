import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Bir şeyler ters gitti</h1>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs">
            Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin veya ana sayfaya dönün.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={this.handleGoHome}>
              Ana Sayfa
            </Button>
            <Button onClick={this.handleReload}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Yenile
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
