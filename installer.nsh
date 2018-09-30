 !macro customInstall
   WriteRegStr HKLM “Software\Microsoft\Windows\CurrentVersion\Run” “CGG” “${PROJECT_DIR}\test.exe”
 !macroend