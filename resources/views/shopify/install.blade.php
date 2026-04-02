<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('shopify-app.app_name') }} - Install</title>
    <style>
        :root {
            color-scheme: light;
        }
        body {
            margin: 0;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            background: #f8fafc;
            color: #0f172a;
        }
        .container {
            max-width: 560px;
            margin: 60px auto;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 28px;
            box-shadow: 0 6px 24px rgba(15, 23, 42, 0.06);
        }
        h1 {
            margin: 0 0 8px;
            font-size: 1.5rem;
        }
        p {
            margin: 0 0 18px;
            color: #475569;
        }
        label {
            display: block;
            font-weight: 600;
            margin-bottom: 8px;
        }
        .field-row {
            display: flex;
            gap: 10px;
        }
        input[type="text"] {
            flex: 1;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 10px 12px;
            font-size: 0.95rem;
        }
        button {
            border: 0;
            border-radius: 8px;
            padding: 10px 16px;
            background: #1f2937;
            color: #ffffff;
            font-weight: 600;
            cursor: pointer;
        }
        .hint {
            margin-top: 10px;
            font-size: 0.9rem;
            color: #64748b;
        }
    </style>
</head>
<body>
    <main class="container">
        <h1>Connect your Shopify store</h1>
        <p>{{ $message ?? 'Enter your store domain to continue.' }}</p>

        <form method="GET" action="{{ route(config('shopify-app.route_names.authenticate')) }}">
            <label for="shop">Shop domain</label>
            <div class="field-row">
                <input
                    id="shop"
                    name="shop"
                    type="text"
                    placeholder="your-store.myshopify.com"
                    value="{{ old('shop', $shop ?? '') }}"
                    required
                    autocomplete="off"
                >
                <button type="submit">Continue</button>
            </div>
            <p class="hint">Use your full <code>.myshopify.com</code> domain.</p>
        </form>
    </main>
</body>
</html>
