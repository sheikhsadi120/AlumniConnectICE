$apiKey = "YOUR_BREVO_API_KEY"
$headers = @{ "api-key" = $apiKey; "Accept" = "application/json"; "Content-Type" = "application/json" }
$domainData = @{ domain = "ru.ac.bd" }
try {
    $response = Invoke-RestMethod -Uri "https://api.brevo.com/v3/senders/domains" -Method Post -Headers $headers -Body ($domainData | ConvertTo-Json)
    $response | ConvertTo-Json -Depth 5
} catch {
    $_ | ConvertTo-Json
}
