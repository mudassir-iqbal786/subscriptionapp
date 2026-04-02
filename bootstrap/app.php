<?php

use Illuminate\Http\Request;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Osiset\ShopifyApp\Exceptions\InvalidShopDomainException;
use Osiset\ShopifyApp\Exceptions\MissingShopDomainException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->validateCsrfTokens(except: [
            '*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $renderInstallForm = function (Request $request, string $message) {
            if ($request->expectsJson()) {
                return response()->json(['message' => $message], 422);
            }

            return response()->view('shopify.install', [
                'message' => $message,
                'shop' => (string) $request->query('shop', ''),
            ]);
        };

        $exceptions->render(function (MissingShopDomainException $e, Request $request) use ($renderInstallForm) {
            return $renderInstallForm($request, 'Enter your Shopify store domain to continue.');
        });

        $exceptions->render(function (InvalidShopDomainException $e, Request $request) use ($renderInstallForm) {
            return $renderInstallForm($request, $e->getMessage());
        });
    })->create();
