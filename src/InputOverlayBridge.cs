using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text.Json;
using System.Threading.Tasks;
using WebSocketSharp.Server;

class InputOverlayBehavior : WebSocketBehavior
{
    protected override void OnOpen()
    {
        Console.WriteLine("Client connected");
    }

    protected override void OnClose(WebSocketSharp.CloseEventArgs e)
    {
        Console.WriteLine("Client disconnected");
    }
}

class Program
{
    static async Task Main(string[] args)
    {
        string endpoint = "ws://localhost:8765";
        var wss = new WebSocketServer(endpoint);

        wss.AddWebSocketService<InputOverlayBehavior>("/");
        wss.Start();

        Console.WriteLine($"WebSocket server running on {endpoint}");

        var psi = new ProcessStartInfo
        {
            FileName = "/usr/bin/showmethekey-cli",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        var proc = new Process { StartInfo = psi };
        proc.Start();

        Console.WriteLine("showmethekey-cli started");

        _ = Task.Run(async () =>
        {
            string? err;
            while ((err = await proc.StandardError.ReadLineAsync()) != null)
            {
                if (!string.IsNullOrWhiteSpace(err))
                    Console.WriteLine($"[smtk stderr] {err}");
            }
        });

        string? line;
        while ((line = await proc.StandardOutput.ReadLineAsync()) != null)
        {
            if (string.IsNullOrWhiteSpace(line))
                continue;

            Console.WriteLine($"[smtk raw] {line}");

            try
            {
                using var doc = JsonDocument.Parse(line);
                var root = doc.RootElement;

                if (!root.TryGetProperty("event_name", out var evNameProp) ||
                    !root.TryGetProperty("key_name", out var keyNameProp) ||
                    !root.TryGetProperty("state_name", out var stateNameProp))
                {
                    Console.WriteLine("[smtk parse] missing expected fields");
                    continue;
                }

                var eventName = evNameProp.GetString() ?? "";
                var stateName = stateNameProp.GetString() ?? "";
                var keyName   = keyNameProp.GetString() ?? "";

                if (eventName != "KEYBOARD_KEY" && eventName != "POINTER_BUTTON")
                    continue;

                string state = stateName switch
                {
                    "PRESSED"  => "key_press",
                    "RELEASED" => "key_release",
                    _ => ""
                };
                if (state == "") continue;

                string key =
                    keyName.StartsWith("KEY_") ? keyName.Substring(4) : keyName;

                var payload = new { type = state, key = key };
                string jsonOut = JsonSerializer.Serialize(payload);

                Console.WriteLine($"[bridge] {jsonOut}");
                wss.WebSocketServices["/"].Sessions.Broadcast(jsonOut);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[smtk error] {ex.Message}");
            }
        }

        Console.WriteLine("showmethekey-cli exited");
        wss.Stop();
    }
}
