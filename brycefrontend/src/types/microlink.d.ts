declare module '@microlink/react' {
  import { FC, CSSProperties, ReactNode } from 'react';

  interface MicrolinkProps {
    url: string;
    size?: 'small' | 'large' | 'normal';
    contrast?: boolean;
    media?: string[] | string;
    direction?: 'ltr' | 'rtl' | 'auto';
    style?: CSSProperties;
    className?: string;
    children?: ReactNode;
  }

  const Microlink: FC<MicrolinkProps>;
  export default Microlink;
} 

declare module '@microlink/mql' {
  interface MicrolinkResponse {
    status: 'success' | 'error';
    data: {
      title?: string;
      description?: string;
      lang?: string;
      author?: string;
      publisher?: string;
      image?: {
        url?: string;
        type?: string;
        size?: number;
        height?: number;
        width?: number;
      };
      logo?: {
        url?: string;
      };
      url: string;
      date?: string;
      [key: string]: unknown;
    };
  }

  interface MqlOptions {
    apiKey?: string;
    endpoint?: string;
    cache?: boolean | number;
    [key: string]: unknown;
  }

  function mql(url: string, options?: MqlOptions): Promise<MicrolinkResponse>;
  
  namespace mql {
    function render(data: MicrolinkResponse['data']): void;
  }
  
  export default mql;
} 