<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="shopify-api-key" content="{{ config('shopify-app.api_key') }}">
    <meta name="shopify-theme-block-handle" content="{{ config('shopify-app.theme_block_handle') }}">
    <meta name="shopify-subscription-management-settings-url" content="{{ config('shopify-app.subscription_management_settings_url') }}">
    <title>{{ config('app.name', 'Shopify App') }}</title>
    <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
    <script src="https://cdn.shopify.com/shopifycloud/polaris.js"></script>
    @viteReactRefresh
    @vite('resources/js/app.jsx')
</head>

<body>
<div id="app"></div>

@include('shopify-app::partials.token_handler')
</body>
</html>
