<?php

use App\Core\Router;
use App\Modules\Auth\CivilianAuthController;
use App\Modules\Call\CallController;

/** @var Router $router */

// Auth - Civilian
$router->add('POST', '/api/v1/auth/civilian/register', [CivilianAuthController::class, 'register']);
$router->add('POST', '/api/v1/auth/civilian/login', [CivilianAuthController::class, 'login']);

// Calls
$router->add('POST', '/api/v1/calls', [CallController::class, 'createEmergencyCall']);
$router->add('POST', '/api/v1/calls/{id}/status', [CallController::class, 'updateStatus']);
