<?php

namespace App\Core;

class Router
{
    private array $routes = [];

    public function add(string $method, string $path, callable|array $handler): void
    {
        $this->routes[strtoupper($method)][] = [
            'path' => $path,
            'handler' => $handler,
        ];
    }

    public function dispatch(string $method, string $uri): void
    {
        $method = strtoupper($method);
        $path = parse_url($uri, PHP_URL_PATH) ?? '/';

        foreach ($this->routes[$method] ?? [] as $route) {
            if ($route['path'] === $path) {
                $handler = $route['handler'];
                if (is_array($handler)) {
                    [$class, $action] = $handler;
                    $instance = new $class();
                    $instance->$action();
                    return;
                }
                call_user_func($handler);
                return;
            }
        }

        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Not Found']);
    }
}
