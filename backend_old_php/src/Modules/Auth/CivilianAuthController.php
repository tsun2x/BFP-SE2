<?php

namespace App\Modules\Auth;

use App\Core\Controller;

class CivilianAuthController extends Controller
{
    public function register(): void
    {
        // TODO: implement registration logic
        $this->json(['message' => 'register endpoint']);
    }

    public function login(): void
    {
        // TODO: implement login logic
        $this->json(['message' => 'login endpoint']);
    }
}
