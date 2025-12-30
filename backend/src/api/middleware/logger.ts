import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Log request
  console.log(`→ ${req.method} ${req.path}`, {
    query: req.query,
    body: req.body ? '[body present]' : undefined,
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`← ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });

  next();
}

export function corsLogger(req: Request, _res: Response, next: NextFunction): void {
  if (req.method === 'OPTIONS') {
    console.log(`CORS preflight: ${req.path}`);
  }
  next();
}
