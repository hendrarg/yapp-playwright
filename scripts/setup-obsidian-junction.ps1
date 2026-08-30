# Creates directory junctions linking yapp repo to the Obsidian vault.
# Run once after clone if domain-knowledge is missing from .agents/
#
# Default vault: D:\Knowledge
# Override: $env:YAPP_OBSIDIAN_VAULT = "C:\path\to\vault"

$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$VaultRoot = if ($env:YAPP_OBSIDIAN_VAULT) { $env:YAPP_OBSIDIAN_VAULT } else { 'D:\Knowledge' }
$DomainKnowledgeVault = Join-Path $VaultRoot 'projects\yapp\domain-knowledge'
$DomainKnowledgeRepo = Join-Path $RepoRoot '.agents\domain-knowledge'
$RepoJunctionInVault = Join-Path $VaultRoot 'projects\yapp\repo'

if (-not (Test-Path $DomainKnowledgeVault)) {
    Write-Error "Vault domain-knowledge not found: $DomainKnowledgeVault`nCreate the vault folder or set YAPP_OBSIDIAN_VAULT."
}

function Set-Junction {
    param([string]$Link, [string]$Target)
    if (Test-Path $Link) {
        $item = Get-Item $Link -Force
        if ($item.LinkType -eq 'Junction' -and $item.Target -contains $Target) {
            Write-Host "OK (exists): $Link -> $Target"
            return
        }
        if ($item.LinkType) {
            Write-Error "$Link exists and is not the expected junction. Remove manually first."
        }
        Remove-Item $Link -Recurse -Force
    }
    cmd /c mklink /J "`"$Link`"" "`"$Target`""
    Write-Host "Created junction: $Link -> $Target"
}

Set-Junction -Link $DomainKnowledgeRepo -Target $DomainKnowledgeVault

if (-not (Test-Path $RepoJunctionInVault)) {
    Set-Junction -Link $RepoJunctionInVault -Target $RepoRoot
}

Write-Host "Done. Verify: Test-Path '$DomainKnowledgeRepo\products.md'"
