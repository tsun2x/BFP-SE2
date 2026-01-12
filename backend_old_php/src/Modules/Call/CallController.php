<?php

namespace App\Modules\Call;

use App\Core\Controller;

class CallController extends Controller
{
    public function createEmergencyCall(): void
    {
        // TODO: implement emergency call creation
        $this->json(['message' => 'create emergency call']);
    }

    public function updateStatus(): void
    {
        // TODO: implement call status update
        $this->json(['message' => 'update call status']);
    }
}
