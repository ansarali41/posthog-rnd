import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PosthogService } from './posthog.service';
import { Request, Response } from 'express';

@Injectable()
export class PosthogInterceptor implements NestInterceptor {
    constructor(private readonly posthogService: PosthogService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();

        const startTime = Date.now();
        const method = request.method;
        const url = request.url;
        const path = request.route?.path || request.path;
        const query = request.query;
        const body = this.sanitizeBody(request.body);
        const headers = this.sanitizeHeaders(request.headers);
        // Get session ID from frontend (if provided in headers)
        const sessionId = (request.headers['x-session-id'] as string) || undefined;
        // Only track POST, PUT, PATCH requests
        const shouldTrack = ['POST', 'PUT', 'PATCH'].includes(method);
        const currentUserId = (request as any).user?.id?.toString() || 'anonymous';

        return next.handle().pipe(
            tap({
                next: async responseData => {
                    // Only track POST, PUT, PATCH requests
                    if (shouldTrack) {
                        const duration = Date.now() - startTime;
                        const statusCode = response.statusCode || 200;

                        await this.posthogService.trackWriteRequestWithComparison({
                            method,
                            path,
                            url,
                            requestBody: body,
                            responseBody: this.sanitizeResponse(responseData),
                            statusCode,
                            userId: currentUserId,
                            duration,
                            sessionId,
                        });
                    }
                    // GET, DELETE, HEAD, OPTIONS, etc. are not tracked
                },
                error: error => {
                    const duration = Date.now() - startTime;
                    const statusCode = error.status || 500;
                    // Get user ID from authenticated user (JWT) or anonymous
                    const currentUserId = (request as any).user?.id?.toString() || 'anonymous';

                    // ONLY track errors - this is the unified error handler for backend
                    this.posthogService.trackError({
                        errorName: error.constructor?.name || 'Error',
                        errorMessage: error.message,
                        errorStack: error.stack?.substring(0, 1000), // Limit stack trace
                        userId: currentUserId,
                        sessionId, // Include session ID for linking with frontend replay
                        context: {
                            method,
                            url,
                            path,
                            query,
                            requestBody: body,
                            requestHeaders: headers,
                            statusCode,
                            duration,
                            timestamp: new Date().toISOString(),
                        },
                    });
                },
            }),
        );
    }

    private sanitizeBody(body: any): any {
        if (!body) return null;

        // Remove sensitive fields
        const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'apikey'];
        const sanitized = { ...body };

        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }

        // Limit size
        const bodyStr = JSON.stringify(sanitized);
        if (bodyStr.length > 1000) {
            return JSON.parse(bodyStr.substring(0, 1000) + '...');
        }

        return sanitized;
    }

    private sanitizeHeaders(headers: any): any {
        if (!headers) return null;

        // Remove sensitive headers
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        const sanitized: any = {};

        for (const [key, value] of Object.entries(headers)) {
            if (sensitiveHeaders.includes(key.toLowerCase())) {
                sanitized[key] = '[REDACTED]';
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    private sanitizeResponse(data: any): any {
        if (!data) return null;

        // Limit response size
        const dataStr = JSON.stringify(data);
        if (dataStr.length > 2000) {
            return {
                _truncated: true,
                _size: dataStr.length,
                preview: JSON.parse(dataStr.substring(0, 2000) + '...'),
            };
        }

        return data;
    }
}
