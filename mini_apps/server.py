#!/usr/bin/env python3
"""
Простой HTTP сервер для локального тестирования Telegram Mini Apps
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP обработчик с поддержкой CORS"""
    
    def end_headers(self):
        # Добавляем CORS заголовки
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        # Обработка preflight запросов
        self.send_response(200)
        self.end_headers()

def main():
    """Запуск локального сервера"""
    # Переходим в директорию mini_apps
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Настройки сервера
    PORT = 8000
    HOST = 'localhost'
    
    print(f"🚀 Запуск HTTP сервера для Mini Apps...")
    print(f"📂 Директория: {script_dir}")
    print(f"🌐 Адрес: http://{HOST}:{PORT}")
    print(f"⭐ Premium App: http://{HOST}:{PORT}/premium/")
    print()
    print("📋 Для тестирования в Telegram:")
    print(f"   Обновите webapp_url в main_no_db.py:")
    print(f"   webapp_url = 'http://{HOST}:{PORT}/premium/index.html'")
    print()
    print("⚠️  ВНИМАНИЕ: Для продакшн нужен HTTPS!")
    print("   Telegram Mini Apps требуют безопасное соединение")
    print()
    print("🛑 Для остановки нажмите Ctrl+C")
    print("-" * 60)
    
    try:
        # Создаем и запускаем сервер
        with socketserver.TCPServer((HOST, PORT), CORSHTTPRequestHandler) as httpd:
            print(f"✅ Сервер запущен на http://{HOST}:{PORT}")
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n👋 Сервер остановлен")
        
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Порт {PORT} уже используется")
            print(f"   Попробуйте другой порт или завершите процесс на порту {PORT}")
        else:
            print(f"❌ Ошибка запуска сервера: {e}")
        sys.exit(1)
        
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
