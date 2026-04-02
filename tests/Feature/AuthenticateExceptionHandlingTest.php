<?php

namespace Tests\Feature;

use Tests\TestCase;

class AuthenticateExceptionHandlingTest extends TestCase
{
    public function test_authenticate_without_shop_renders_install_form(): void
    {
        $response = $this->get('/authenticate');

        $response
            ->assertOk()
            ->assertSee('Connect your Shopify store')
            ->assertSee('Enter your Shopify store domain to continue.');
    }

    public function test_authenticate_without_shop_returns_json_when_requested(): void
    {
        $response = $this->getJson('/authenticate');

        $response
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Enter your Shopify store domain to continue.',
            ]);
    }
}
