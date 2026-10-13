import { CodeArtifact } from '../types';

export const CODE_ARTIFACTS: CodeArtifact[] = [
  {
    id: 'pubspec-yaml',
    phase: 'phase1',
    fileName: 'pubspec.yaml',
    filePath: 'pubspec.yaml',
    language: 'yaml',
    title: 'Phase 1: Project Setup & Dependencies',
    description: 'Universal Flutter dependencies for cross-platform LAN/WAN messaging across Windows, Android, and iOS.',
    content: `name: hybrid_messenger
description: "Cross-platform Hybrid LAN & WAN Encrypted Messenger (Windows, Android, iOS)"
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.3.0 <4.0.0'
  flutter: '>=3.19.0'

dependencies:
  flutter:
    sdk: flutter

  # --- Network Discovery & Connectivity ---
  # Resolves device local Wi-Fi IP and broadcast subnet address
  network_info_plus: ^5.0.1

  # Cross-platform socket and connectivity diagnostics
  connectivity_plus: ^6.0.3

  # --- WAN Cloud Relay (Socket.io) ---
  # WebSocket client for cloud signaling and fallback relaying
  socket_io_client: ^3.0.1

  # --- Local Cross-Platform SQLite Engine ---
  # Windows Desktop SQLite via FFI runtime
  sqflite_common_ffi: ^2.3.3
  
  # Mobile SQLite (Android & iOS)
  sqflite: ^2.3.3+1
  
  # Bundled dynamic C-libraries for Windows and Linux builds
  sqlite3_flutter_libs: ^0.5.24

  # Cross-platform file storage paths for local DB and media cache
  path_provider: ^2.1.3
  path: ^1.9.0

  # --- End-to-End Cryptography (AES-256) ---
  # AES-256 GCM / CBC encryption wrapper
  encrypt: ^5.0.3
  
  # SHA-256 key derivation and message digest verification
  crypto: ^3.0.3

  # --- Native Permission & Device Identifiers ---
  # Handles runtime Wi-Fi, Storage, and Notification permissions
  permission_handler: ^11.3.1

  # UUID v4 generator for unique message, session, and peer IDs
  uuid: ^4.4.0

  # --- UI & Utilities ---
  # Fluent / Cupertino icon support
  cupertino_icons: ^1.0.8

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/images/
`
  },
  {
    id: 'android-manifest',
    phase: 'phase2',
    fileName: 'AndroidManifest.xml',
    filePath: 'android/app/src/main/AndroidManifest.xml',
    language: 'xml',
    title: 'Phase 2: Android Manifest Permissions & Network Security',
    description: 'Enables Multicast socket reception, cleartext LAN communication, and Wi-Fi state management.',
    content: `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.hybrid.messenger">

    <!-- REQUIRED FOR UDP BROADCAST & MULTICAST DISCOVERY -->
    <!-- Essential: Without this, Android kernel silently drops incoming UDP 41234 packets -->
    <uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- REQUIRED FOR DIRECT TCP SOCKETS & SOCKET.IO WAN RELAY -->
    <uses-permission android:name="android.permission.INTERNET" />

    <!-- REQUIRED FOR LOCAL STORAGE & P2P FILE TRANSFERS -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />

    <application
        android:label="Hybrid Messenger"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher"
        android:usesCleartextTraffic="true">
        <!-- usesCleartextTraffic allows direct raw TCP socket transmission on private IP subnets without TLS requirement -->

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:taskAffinity=""
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            
            <meta-data
              android:name="io.flutter.embedding.android.NormalTheme"
              android:resource="@style/NormalTheme" />
              
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>

        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>

    <!-- Required for Android 11 (API 30+) package visibility -->
    <queries>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="https" />
        </intent>
    </queries>
</manifest>`
  },
  {
    id: 'android-mainactivity',
    phase: 'phase2',
    fileName: 'MainActivity.kt',
    filePath: 'android/app/src/main/kotlin/com/hybrid/messenger/MainActivity.kt',
    language: 'kotlin',
    title: 'Phase 2: Android Native WifiManager.MulticastLock Bridge',
    description: 'Kotlin MethodChannel implementation that acquires and releases Android OS MulticastLock with lifecycle cleanup.',
    content: `package com.hybrid.messenger

import android.content.Context
import android.net.wifi.WifiManager
import android.util.Log
import androidx.annotation.NonNull
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.hybrid.messenger/multicast"
    private val TAG = "HybridMulticastBridge"
    
    // Hold reference to the system MulticastLock
    private var multicastLock: WifiManager.MulticastLock? = null

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "acquireMulticastLock" -> {
                    val success = acquireLock()
                    if (success) {
                        result.success(true)
                    } else {
                        result.error("LOCK_FAILED", "Failed to acquire WifiManager.MulticastLock", null)
                    }
                }
                "releaseMulticastLock" -> {
                    val success = releaseLock()
                    result.success(success)
                }
                "isLockHeld" -> {
                    result.success(multicastLock?.isHeld == true)
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    /**
     * Initializes and acquires the MulticastLock.
     * Crucial: On Android, the Wi-Fi chip hardware power-saving filter discards
     * broadcast and multicast frames unless this lock is explicitly held.
     */
    private fun acquireLock(): Boolean {
        return try {
            if (multicastLock == null) {
                val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
                if (wifiManager == null) {
                    Log.e(TAG, "WifiManager service is unavailable on this device.")
                    return false
                }
                // Acquire reference-counted lock
                multicastLock = wifiManager.createMulticastLock("HybridMessengerUdpDiscoveryLock").apply {
                    setReferenceCounted(true)
                }
            }

            if (multicastLock?.isHeld != true) {
                multicastLock?.acquire()
                Log.d(TAG, "WifiManager.MulticastLock successfully acquired.")
            } else {
                Log.d(TAG, "MulticastLock already held.")
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Exception while acquiring MulticastLock: \${e.localizedMessage}", e)
            false
        }
    }

    /**
     * Safely releases the MulticastLock to preserve battery life when peer discovery is paused.
     */
    private fun releaseLock(): Boolean {
        return try {
            if (multicastLock != null && multicastLock?.isHeld == true) {
                multicastLock?.release()
                Log.d(TAG, "WifiManager.MulticastLock released.")
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Exception while releasing MulticastLock: \${e.localizedMessage}", e)
            false
        }
    }

    /**
     * Lifecycle safety: Always release the lock when Activity is destroyed to prevent battery leakage.
     */
    override fun onDestroy() {
        releaseLock()
        multicastLock = null
        super.onDestroy()
    }
}`
  },
  {
    id: 'ios-infoplist',
    phase: 'phase2',
    fileName: 'Info.plist',
    filePath: 'ios/Runner/Info.plist',
    language: 'plist',
    title: 'Phase 2: iOS Info.plist Local Network & Bonjour Entitlements',
    description: 'Mandatory iOS 14+ permissions for UDP broadcasts, direct TCP socket connections, and Bonjour services.',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleDisplayName</key>
	<string>Hybrid Messenger</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>hybrid_messenger</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>$(FLUTTER_BUILD_NAME)</string>
	<key>CFBundleSignature</key>
	<string>????</string>
	<key>CFBundleVersion</key>
	<string>$(FLUTTER_BUILD_NUMBER)</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>

	<!-- ======================================================== -->
	<!-- MANDATORY FOR IOS 14+ LOCAL NETWORK (UDP & TCP SOCKETS)  -->
	<!-- ======================================================== -->
	<!-- System dialog prompting user to grant Local Network access -->
	<key>NSLocalNetworkUsageDescription</key>
	<string>Hybrid Messenger requires access to your local Wi-Fi network to discover nearby peers and deliver messages instantly via peer-to-peer LAN sockets.</string>

	<!-- Bonjour services advertised and scanned on local subnet -->
	<key>NSBonjourServices</key>
	<array>
		<string>_hybrid-lan._tcp</string>
		<string>_hybrid-lan._udp</string>
	</array>

	<!-- Network Security: Allow arbitrary loads on RFC 1918 private subnets -->
	<key>NSAppTransportSecurity</key>
	<dict>
		<key>NSAllowsLocalNetworking</key>
		<true/>
	</dict>

	<key>UILaunchStoryboardName</key>
	<string>LaunchScreen</string>
	<key>UIMainStoryboardFile</key>
	<string>Main</string>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>UIViewControllerBasedStatusBarAppearance</key>
	<false/>
	<key>CADisableMinimumFrameDurationOnPhone</key>
	<true/>
	<key>UIApplicationSupportsIndirectInputEvents</key>
	<true/>
</dict>
</plist>`
  },
  {
    id: 'windows-runner',
    phase: 'phase2',
    fileName: 'windows_setup_notes.dart',
    filePath: 'lib/core/platform/windows_sqlite_init.dart',
    language: 'dart',
    title: 'Phase 2: Windows Desktop Platform SQLite Runtime Fix',
    description: 'Initializes SQLite FFI dynamic libraries on Windows before opening any database connections.',
    content: `// lib/core/platform/windows_sqlite_init.dart
import 'dart:io';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// Initializes SQLite dynamic C-library loading for Windows Desktop (.exe).
/// Must be invoked in main() before runApp() or any database operation.
void initializeDesktopSqlite() {
  if (Platform.isWindows || Platform.isLinux) {
    // Initialize FFI loader
    sqfliteFfiInit();
    // Assign global database factory to FFI implementation
    databaseFactory = databaseFactoryFfi;
  }
}
`
  }
];
