/**
 * ERROR HANDLER UTILITY
 *
 * This file provides centralized error handling utilities for the DevOps Insights Dashboard backend.
 * It serves as a global error management system that standardizes how errors are caught, logged,
 * and returned to clients throughout the application.
 *
 * Key Responsibilities:
 * - Standardize error response formats across all API endpoints
 * - Provide consistent HTTP status code handling
 * - Log errors with appropriate detail levels for debugging and monitoring
 * - Transform internal errors into user-friendly messages
 * - Handle different error types (validation, authentication, authorization, server errors)
 * - Support error tracking and monitoring for DevOps insights
 *
 * This is typically used as middleware in Express routes and as a utility in service layers
 * to ensure consistent error handling across the entire application.
 */

import HTTP_STATUS from "http-status-codes";
