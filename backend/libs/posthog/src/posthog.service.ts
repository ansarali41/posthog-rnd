import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PostHog } from 'posthog-node';
import { TrackedEventDto } from './dto/tracked-event.dto';

interface TrackedEvent {
    distinctId: string;
    eventName: string;
    properties: Record<string, any>;
    timestamp: Date;
}

@Injectable()
export class PosthogService implements OnModuleInit, OnModuleDestroy {
    private client: PostHog;
    private readonly logger = new Logger(PosthogService.name);
    private eventLog: TrackedEvent[] = [];
    private readonly MAX_LOG_SIZE = 100; // Keep last 100 events

    constructor() {
        // Initialize PostHog client
        // Get your API key from https://app.posthog.com/project/settings
        const apiKey = process.env.POSTHOG_API_KEY || 'phc_your_api_key_here';
        const host = process.env.POSTHOG_HOST || 'https://app.posthog.com';

        // Validate API key
        if (!apiKey || apiKey === 'phc_your_api_key_here') {
            this.logger.warn('⚠️  PostHog API key not configured! Events will not be sent to PostHog.');
        }

        this.client = new PostHog(apiKey, {
            host: host,
            flushAt: 1, // Flush after 1 event (for immediate testing)
            flushInterval: 5000, // Or flush every 5 seconds
        });
    }

    onModuleInit() {
        const apiKey = process.env.POSTHOG_API_KEY || 'phc_your_api_key_here';
        const host = process.env.POSTHOG_HOST || 'https://app.posthog.com';

        if (!apiKey || apiKey === 'phc_your_api_key_here') {
            this.logger.error('❌ PostHog API key is not configured!');
        } else {
            this.logger.log('✅ PostHog client initialized');
        }
    }

    onModuleDestroy() {
        // Shutdown PostHog client gracefully
        this.client.shutdown();
    }

    /**
     * Track an event
     * @param distinctId - Unique identifier for the user
     * @param eventName - Name of the event
     * @param properties - Additional properties for the event
     */
    track(distinctId: string, eventName: string, properties?: Record<string, any>) {
        const apiKey = process.env.POSTHOG_API_KEY || 'phc_your_api_key_here';

        // Don't track if API key is not configured
        if (!apiKey || apiKey === 'phc_your_api_key_here') {
            return;
        }

        const eventData = {
            distinctId,
            event: eventName,
            properties: {
                ...properties,
                timestamp: new Date().toISOString(),
                $lib: 'posthog-node',
                $lib_version: '4.0.0',
            },
        };

        try {
            // Track in PostHog
            this.client.capture(eventData);
            this.logger.log(`✅ Event sent to PostHog: ${eventName}`);
        } catch (error) {
            this.logger.error(`   ❌ Failed to send event to PostHog: ${error.message}`);
        }

        // Store in local log
        const trackedEvent: TrackedEvent = {
            distinctId,
            eventName,
            properties: properties || {},
            timestamp: new Date(),
        };

        this.eventLog.push(trackedEvent);

        // Keep only last MAX_LOG_SIZE events
        if (this.eventLog.length > this.MAX_LOG_SIZE) {
            this.eventLog = this.eventLog.slice(-this.MAX_LOG_SIZE);
        }
    }

    /**
     * Identify a user
     * @param distinctId - Unique identifier for the user
     * @param properties - User properties
     */
    identify(distinctId: string, properties?: Record<string, any>) {
        this.client.identify({
            distinctId,
            properties,
        });
    }

    /**
     * Get the PostHog client instance (for advanced usage)
     */
    getClient(): PostHog {
        return this.client;
    }

    /**
     * Get recent tracked events (for debugging/monitoring)
     * @param limit - Maximum number of events to return
     */
    getRecentEvents(limit: number = 50): TrackedEventDto[] {
        return this.eventLog
            .slice(-limit)
            .reverse()
            .map(event => ({
                distinctId: event.distinctId,
                eventName: event.eventName,
                properties: event.properties,
                timestamp: event.timestamp,
            }));
    }

    /**
     * Clear the event log
     */
    clearEventLog() {
        this.eventLog = [];
        this.logger.log('PostHog event log cleared');
    }

    /**
     * Flush events immediately (useful for testing)
     */
    async flush() {
        try {
            // Force flush by calling shutdown and reinitializing
            this.client.shutdown();
            const apiKey = process.env.POSTHOG_API_KEY || 'phc_your_api_key_here';
            const host = process.env.POSTHOG_HOST || 'https://app.posthog.com';
            this.client = new PostHog(apiKey, {
                host: host,
                flushAt: 1,
                flushInterval: 5000,
            });
            this.logger.log('✅ PostHog events flushed');
        } catch (error) {
            this.logger.error(`❌ Failed to flush PostHog events: ${error.message}`);
        }
    }

    /**
     * Unified error tracking method - ONLY tracks errors
     * This is the single entry point for all error tracking (frontend + backend)
     */
    trackError(details: {
        errorName: string;
        errorMessage: string;
        errorStack?: string;
        userId: string;
        sessionId?: string; // Frontend session ID for linking with session replay
        context?: Record<string, any>;
        errorType?: 'frontend_error' | 'backend_error' | 'api_error';
    }) {
        const errorType = details.errorType || 'backend_error';
        const posthogHost = process.env.POSTHOG_HOST || 'https://app.posthog.com';

        const properties: Record<string, any> = {
            error_name: details.errorName,
            error_message: details.errorMessage,
            error_type: errorType,
            timestamp: new Date().toISOString(),
        };

        // Add stack trace (sanitized)
        if (details.errorStack) {
            properties.error_stack = details.errorStack;
        }

        // Add context (request details, etc.)
        if (details.context) {
            // Sanitize context to remove sensitive data
            const sanitizedContext = { ...details.context };
            if (sanitizedContext.requestHeaders) {
                sanitizedContext.requestHeaders = this.sanitizeHeaders(sanitizedContext.requestHeaders);
            }
            if (sanitizedContext.requestBody) {
                sanitizedContext.requestBody = this.sanitizeBody(sanitizedContext.requestBody);
            }
            properties.context = sanitizedContext;
        }

        // Add session replay link if session ID is provided
        if (details.sessionId) {
            const apiKey = process.env.POSTHOG_API_KEY || 'phc_your_api_key_here';
            const projectId = this.getProjectId(apiKey);

            properties.$session_id = details.sessionId;

            // PostHog session replay URL format: /project/{projectId}/replay/{sessionId}
            if (projectId) {
                properties.session_replay_url = `${posthogHost}/project/${projectId}/replay/${details.sessionId}`;
            } else {
                // Fallback: try to construct URL without project ID (may not work)
                properties.session_replay_url = `${posthogHost}/replay/${details.sessionId}`;
                this.logger.warn('⚠️ Could not extract project ID for session replay URL');
            }

            properties.$error_with_session_replay = true;
        }

        // Add safe user info (only ID, no sensitive data)
        if (details.userId && details.userId !== 'anonymous') {
            properties.user_id = details.userId;
        }

        // Track error event (ONLY errors, no success events)
        this.track(details.userId, 'error_occurred', properties);
    }

    /**
     * Sanitize headers to remove sensitive information
     */
    private sanitizeHeaders(headers: any): any {
        if (!headers) return null;

        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-session-id'];
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

    /**
     * Sanitize body to remove sensitive fields
     */
    private sanitizeBody(body: any): any {
        if (!body) return null;

        const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'apikey', 'access_token'];
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

    /**
     * Get PostHog configuration status
     */
    getStatus() {
        const apiKey = process.env.POSTHOG_API_KEY || 'phc_your_api_key_here';
        const host = process.env.POSTHOG_HOST || 'https://app.posthog.com';

        return {
            configured: apiKey && apiKey !== 'phc_your_api_key_here',
            host,
            eventLogSize: this.eventLog.length,
        };
    }

    /**
     * Get previous API call from PostHog API
     * Queries PostHog for the most recent api_write_request event matching the endpoint
     *
     * Note: Requires POSTHOG_API_KEY to be set. For querying events, you may need a
     * Personal API Key (not project API key). Get it from:
     * https://app.posthog.com/personal-api-keys
     *
     * If querying fails, the system will gracefully fall back to treating it as a first call.
     */
    async getPreviousCallFromPostHog(
        method: string,
        path: string,
        userId?: string,
    ): Promise<{
        requestBody?: any;
        responseBody?: any;
        timestamp: Date;
        userId?: string;
        eventId?: string;
        statusCode?: number;
        duration?: number;
        method?: string;
        path?: string;
        url?: string;
    } | null> {
        try {
            // Use Personal API Key for querying (if available), otherwise fallback to Project API Key
            // Personal API Key is required for querying events via PostHog API
            // Get it from: https://app.posthog.com/personal-api-keys
            const personalApiKey = process.env.POSTHOG_PERSONAL_API_KEY;
            const projectApiKey = process.env.POSTHOG_API_KEY;
            const apiKey = personalApiKey || projectApiKey; // Prefer Personal API Key for querying
            const host = process.env.POSTHOG_HOST || 'https://app.posthog.com';

            if (!apiKey || apiKey === 'phc_your_api_key_here') {
                this.logger.warn('⚠️ PostHog API key not configured - cannot query for previous calls');
                return null;
            }

            if (!personalApiKey && projectApiKey) {
                this.logger.warn('⚠️ Using Project API Key for querying - this may fail!');
                this.logger.warn('   PostHog Query API requires Personal API Key');
                this.logger.warn('   Get one from: https://app.posthog.com/personal-api-keys');
                this.logger.warn('   Set it as POSTHOG_PERSONAL_API_KEY in your .env file');
            }

            const projectId = this.getProjectId(apiKey);
            if (!projectId) {
                this.logger.warn('⚠️ Could not extract project ID from API key - cannot query for previous calls');
                this.logger.warn('   Set POSTHOG_PROJECT_ID in your .env file');
                return null;
            }

            // Use PostHog Query API to find previous events
            // PostHog Query API format - where clauses must be HogQL strings
            const queryBody = {
                query: {
                    kind: 'EventsQuery',
                    select: ['*'],
                    event: 'api_write_request',
                    // Use HogQL string format for where clause
                    where: [`properties.method = '${method}'`, `properties.path = '${path}'`],
                    orderBy: ['timestamp DESC'],
                    limit: 1,
                },
            };

            // Try PostHog Query API endpoint
            const apiUrl = `${host}/api/projects/${projectId}/query/`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(queryBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.warn(`❌ PostHog Query API failed: ${response.status} ${response.statusText}`);
                this.logger.warn(`Response: ${errorText}`);

                // Try alternative: Events API endpoint (simpler format)
                return await this.tryEventsApiEndpoint(host, projectId, apiKey, method, path, userId);
            }

            const data = await response.json();

            // PostHog Query API returns results in data.results array
            if (data.results && data.results.length > 0) {
                const result = data.results[0];

                // Results are arrays, first element is usually the event data
                const eventData = Array.isArray(result) ? result[0] : result;
                const properties = eventData?.properties || eventData || {};

                this.logger.log(`✅ Found previous call in PostHog: ${method} ${path}`);

                return {
                    requestBody: properties.request_body,
                    responseBody: properties.response_body,
                    timestamp: new Date(properties.timestamp || eventData?.timestamp || Date.now()),
                    userId: properties.user_id || eventData?.distinct_id,
                    eventId: eventData?.uuid || eventData?.id,
                    statusCode: properties.status_code,
                    duration: properties.duration_ms,
                    method: properties.method,
                    path: properties.path,
                    url: properties.url,
                };
            }

            this.logger.warn(`⚠️ No events found in PostHog Query API response for ${method} ${path}`);
            return null;
        } catch (error) {
            this.logger.error(`Error querying PostHog for previous call: ${error.message}`);
            return null;
        }
    }

    /**
     * Fallback: Try Events API endpoint (simpler format)
     */
    private async tryEventsApiEndpoint(host: string, projectId: string, apiKey: string, method: string, path: string, userId?: string): Promise<any | null> {
        try {
            // Use simpler Events API endpoint
            const queryParams = new URLSearchParams();
            queryParams.append('event', 'api_write_request');
            queryParams.append('limit', '1');
            queryParams.append('orderBy', '-timestamp');

            // Filter by properties using PostHog's property filter format
            const propertyFilters = [
                {
                    key: 'method',
                    value: method,
                    operator: 'exact',
                },
                {
                    key: 'path',
                    value: path,
                    operator: 'exact',
                },
            ];
            queryParams.append('properties', JSON.stringify(propertyFilters));

            if (userId && userId !== 'anonymous') {
                queryParams.append('distinct_id', userId);
            }

            const apiUrl = `${host}/api/projects/${projectId}/events/?${queryParams.toString()}`;

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.warn(`Events API also failed: ${response.status}. Response: ${errorText}`);
                return null;
            }

            const data = await response.json();

            // Handle different response formats
            let events = [];
            if (data.results) {
                events = data.results;
            } else if (Array.isArray(data)) {
                events = data;
            } else if (data.events) {
                events = data.events;
            }

            if (events.length > 0) {
                const event = events[0];
                const properties = event.properties || event.event || {};

                this.logger.log(`✅ Found previous call via Events API: ${method} ${path}`);

                return {
                    requestBody: properties.request_body,
                    responseBody: properties.response_body,
                    timestamp: new Date(event.timestamp || event.created_at || Date.now()),
                    userId: event.distinct_id || event.user_id,
                    eventId: event.uuid || event.id || event.event_id,
                    statusCode: properties.status_code,
                    duration: properties.duration_ms,
                    method: properties.method,
                    path: properties.path,
                    url: properties.url,
                };
            }

            return null;
        } catch (error) {
            this.logger.error(`Events API fallback also failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Get PostHog project ID
     * Priority: 1. POSTHOG_PROJECT_ID env var, 2. Extract from API key (if possible)
     */
    private getProjectId(apiKey: string): string | null {
        // First priority: Check environment variable (most reliable)
        const projectId = process.env.POSTHOG_PROJECT_ID;
        if (projectId) {
            return projectId;
        }

        // Second priority: Try to extract from API key
        // Note: PostHog API keys don't always contain project ID in extractable format
        // The format can be: phc_<project_id>_<random> or phc_<random>
        const match = apiKey.match(/phc_([^_]+)/);
        if (match) {
            const extracted = match[1];
            // If it looks like a numeric project ID (PostHog project IDs are numeric)
            if (/^\d+$/.test(extracted)) {
                return extracted;
            }
            // Otherwise, the API key format doesn't contain project ID
        }

        this.logger.warn('⚠️ PostHog project ID not found. Set POSTHOG_PROJECT_ID in .env file');
        return null;
    }

    /**
     * Track write request with PostHog-based comparison
     * Compares current request/response with previous call from PostHog
     */
    async trackWriteRequestWithComparison(details: {
        method: string;
        path: string;
        url: string;
        requestBody?: any;
        responseBody?: any;
        statusCode: number;
        userId: string;
        duration: number;
        sessionId?: string;
    }) {
        // Get previous call from PostHog API
        // Note: PostHog events need time to be processed and indexed before they're queryable
        // If you hit the same API multiple times quickly, you may need to wait 5-10 seconds
        // between calls for the previous call to be available in PostHog
        let previousCall: any = null;
        try {
            previousCall = await this.getPreviousCallFromPostHog(details.method, details.path, details.userId);
            if (!previousCall) {
                this.logger.warn(`⚠️ No previous call found for ${details.method} ${details.path} - Try waiting 10-30 seconds between API calls`);
            }
        } catch (error) {
            this.logger.error(`❌ Error getting previous call from PostHog API: ${error.message}`);
            if (error.stack) {
                this.logger.error(`Stack: ${error.stack}`);
            }
        }

        // Calculate changes
        const changes = this.calculateChanges(previousCall, {
            requestBody: details.requestBody,
            responseBody: details.responseBody,
        });

        const properties: Record<string, any> = {
            method: details.method,
            path: details.path,
            url: details.url,
            status_code: details.statusCode,
            duration_ms: details.duration,
            timestamp: new Date().toISOString(),
        };

        // Add current request/response
        if (details.requestBody) {
            properties.request_body = this.sanitizeBody(details.requestBody);
        }
        if (details.responseBody) {
            properties.response_body = this.sanitizeResponse(details.responseBody);
        }

        // Add previous call for comparison - comprehensive previous call information
        if (previousCall) {
            properties.previous_call = {
                // Request details
                request_body: this.sanitizeBody(previousCall.requestBody),
                // Response details
                response_body: this.sanitizeResponse(previousCall.responseBody),
                // Metadata
                timestamp: previousCall.timestamp.toISOString(),
                status_code: previousCall.statusCode,
                duration_ms: previousCall.duration,
                method: previousCall.method,
                path: previousCall.path,
                url: previousCall.url,
                user_id: previousCall.userId,
                event_id: previousCall.eventId,
            };

            // Also add flat properties for easier filtering in PostHog
            properties.previous_request_body = this.sanitizeBody(previousCall.requestBody);
            properties.previous_response_body = this.sanitizeResponse(previousCall.responseBody);
            properties.previous_timestamp = previousCall.timestamp.toISOString();
            properties.previous_status_code = previousCall.statusCode;
            properties.previous_duration_ms = previousCall.duration;
            if (previousCall.eventId) {
                properties.previous_event_id = previousCall.eventId;
            }
        }

        // Add change analysis
        if (changes.hasChanges) {
            properties.changes = changes.changes;
            properties.change_summary = changes.summary;
            properties.is_first_call = false;
        } else {
            properties.is_first_call = !previousCall;
        }

        // Add session ID if available
        if (details.sessionId) {
            properties.$session_id = details.sessionId;
        }

        // Add user ID
        if (details.userId && details.userId !== 'anonymous') {
            properties.user_id = details.userId;
        }

        // Track event
        this.track(details.userId, 'api_write_request', properties);
    }

    /**
     * Track all API requests (successful requests)
     * Used for GET requests and all successful API calls
     */
    async trackApiRequest(details: {
        method: string;
        path: string;
        url: string;
        requestBody?: any;
        responseBody?: any;
        statusCode: number;
        userId: string;
        duration: number;
        sessionId?: string;
        query?: any;
    }) {
        const properties: Record<string, any> = {
            method: details.method,
            path: details.path,
            url: details.url,
            status_code: details.statusCode,
            duration_ms: details.duration,
            timestamp: new Date().toISOString(),
        };

        // Add request body if present (for POST/PUT/PATCH)
        if (details.requestBody) {
            properties.request_body = this.sanitizeBody(details.requestBody);
        }

        // Add query parameters if present (for GET requests)
        if (details.query && Object.keys(details.query).length > 0) {
            properties.query_params = details.query;
        }

        // Add response body (truncated for large responses)
        if (details.responseBody) {
            properties.response_body = this.sanitizeResponse(details.responseBody);
        }

        // Add session ID if available
        if (details.sessionId) {
            properties.$session_id = details.sessionId;
        }

        // Add user ID
        if (details.userId && details.userId !== 'anonymous') {
            properties.user_id = details.userId;
        }

        // Track event
        this.track(details.userId, 'api_request', properties);
    }

    /**
     * Calculate changes between previous and current API call
     */
    private calculateChanges(
        previous: {
            requestBody?: any;
            responseBody?: any;
            timestamp?: Date;
        } | null,
        current: { requestBody?: any; responseBody?: any },
    ): { hasChanges: boolean; changes: any; summary: string } {
        if (!previous) {
            return {
                hasChanges: false,
                changes: {},
                summary: 'First call to this endpoint',
            };
        }

        const changes: any = {};
        const changeList: string[] = [];

        // Compare request bodies
        if (previous.requestBody && current.requestBody) {
            const requestDiff = this.deepDiff(previous.requestBody, current.requestBody);
            if (Object.keys(requestDiff).length > 0) {
                changes.request_body = requestDiff;
                changeList.push('Request body changed');
            }
        } else if (current.requestBody && !previous.requestBody) {
            changes.request_body = { added: current.requestBody };
            changeList.push('Request body added');
        } else if (previous.requestBody && !current.requestBody) {
            changes.request_body = { removed: previous.requestBody };
            changeList.push('Request body removed');
        }

        // Compare response bodies
        if (previous.responseBody && current.responseBody) {
            const responseDiff = this.deepDiff(previous.responseBody, current.responseBody);
            if (Object.keys(responseDiff).length > 0) {
                changes.response_body = responseDiff;
                changeList.push('Response body changed');
            }
        } else if (current.responseBody && !previous.responseBody) {
            changes.response_body = { added: current.responseBody };
            changeList.push('Response body added');
        } else if (previous.responseBody && !current.responseBody) {
            changes.response_body = { removed: previous.responseBody };
            changeList.push('Response body removed');
        }

        const hasChanges = Object.keys(changes).length > 0;
        const summary = changeList.length > 0 ? changeList.join('; ') : 'No changes detected';

        return { hasChanges, changes, summary };
    }

    /**
     * Deep diff between two objects
     * Returns an object showing what changed, added, or removed
     */
    private deepDiff(prev: any, curr: any): any {
        const diff: any = {};
        const allKeys = new Set([...Object.keys(prev || {}), ...Object.keys(curr || {})]);

        for (const key of allKeys) {
            const prevVal = prev?.[key];
            const currVal = curr?.[key];

            if (prevVal === undefined && currVal !== undefined) {
                diff[key] = { added: currVal };
            } else if (prevVal !== undefined && currVal === undefined) {
                diff[key] = { removed: prevVal };
            } else if (JSON.stringify(prevVal) !== JSON.stringify(currVal)) {
                if (typeof prevVal === 'object' && typeof currVal === 'object' && prevVal !== null && currVal !== null && !Array.isArray(prevVal) && !Array.isArray(currVal)) {
                    const nestedDiff = this.deepDiff(prevVal, currVal);
                    if (Object.keys(nestedDiff).length > 0) {
                        diff[key] = nestedDiff;
                    }
                } else {
                    diff[key] = {
                        previous: prevVal,
                        current: currVal,
                    };
                }
            }
        }

        return diff;
    }

    /**
     * Sanitize response data
     */
    private sanitizeResponse(data: any): any {
        if (!data) return null;
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
