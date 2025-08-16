// Secure Local Mistake Tracking System
// Multiple layers of protection against user manipulation

class SecureMistakeTracker {
  private static instance: SecureMistakeTracker;
  private readonly storageKeys: string[];
  private readonly secretSalt: string;

  constructor() {
    // Generate dynamic keys based on browser fingerprint
    this.secretSalt = this.generateBrowserFingerprint();
    this.storageKeys = this.generateStorageKeys();
    this.initializeStorage();
  }

  static getInstance(): SecureMistakeTracker {
    if (!SecureMistakeTracker.instance) {
      SecureMistakeTracker.instance = new SecureMistakeTracker();
    }
    return SecureMistakeTracker.instance;
  }

  // Generate unique browser fingerprint as secret salt
  private generateBrowserFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('fingerprint', 10, 10);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
      navigator.hardwareConcurrency || 0
    ].join('|');
    
    return this.simpleHash(fingerprint);
  }

  // Generate obfuscated storage keys
  private generateStorageKeys(): string[] {
    const baseKeys = ['primary', 'backup', 'validation'];
    return baseKeys.map(key => 
      this.simpleHash(key + this.secretSalt + window.location.hostname)
    );
  }

  // Simple hash function (in production, use crypto.subtle)
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Encrypt data (simple XOR + base64 for this demo)
  private encrypt(data: string, key: string): string {
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return btoa(encrypted);
  }

  // Decrypt data
  private decrypt(encryptedData: string, key: string): string {
    try {
      const decoded = atob(encryptedData);
      let decrypted = '';
      for (let i = 0; i < decoded.length; i++) {
        decrypted += String.fromCharCode(
          decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      return decrypted;
    } catch {
      return '';
    }
  }

  // Initialize storage with empty mistake data
  private initializeStorage(): void {
    const initialData = {
      mistakes: [],
      totalCount: 0,
      sessionStart: Date.now(),
      lastUpdate: Date.now(),
      checksum: ''
    };
    
    initialData.checksum = this.generateChecksum(initialData);
    
    // Store in multiple locations with different encryption
    this.storeSecurely(initialData);
  }

  // Generate checksum for tamper detection
  private generateChecksum(data: any): string {
    const dataString = JSON.stringify({
      mistakes: data.mistakes,
      totalCount: data.totalCount,
      sessionStart: data.sessionStart
    });
    return this.simpleHash(dataString + this.secretSalt);
  }

  // Store data in multiple encrypted locations
  private storeSecurely(data: any): void {
    const dataString = JSON.stringify(data);
    
    // Store in localStorage with encryption key 1
    localStorage.setItem(
      this.storageKeys[0], 
      this.encrypt(dataString, this.secretSalt + '1')
    );
    
    // Store in sessionStorage with encryption key 2
    sessionStorage.setItem(
      this.storageKeys[1], 
      this.encrypt(dataString, this.secretSalt + '2')
    );
    
    // Store backup in IndexedDB (simplified for demo)
    try {
      localStorage.setItem(
        this.storageKeys[2] + '_backup', 
        this.encrypt(dataString, this.secretSalt + '3')
      );
    } catch (e) {
      console.warn('Backup storage failed');
    }

    // Store decoy data to confuse tamperers
    this.storeDecoyData();
  }

  // Store fake decoy data
  private storeDecoyData(): void {
    const decoyKeys = ['mistakes_count', 'exam_violations', 'user_errors'];
    decoyKeys.forEach(key => {
      localStorage.setItem(key, Math.floor(Math.random() * 5).toString());
    });
  }

  // Retrieve and validate data from multiple sources
  private retrieveSecurely(): any {
    try {
      // Get data from all sources
      const data1 = this.decrypt(
        localStorage.getItem(this.storageKeys[0]) || '', 
        this.secretSalt + '1'
      );
      const data2 = this.decrypt(
        sessionStorage.getItem(this.storageKeys[1]) || '', 
        this.secretSalt + '2'
      );
      const data3 = this.decrypt(
        localStorage.getItem(this.storageKeys[2] + '_backup') || '', 
        this.secretSalt + '3'
      );

      // Parse data
      const parsed1 = data1 ? JSON.parse(data1) : null;
      const parsed2 = data2 ? JSON.parse(data2) : null;
      const parsed3 = data3 ? JSON.parse(data3) : null;

      // Validate consistency across sources
      if (parsed1 && parsed2 && this.dataMatches(parsed1, parsed2)) {
        // Validate checksum
        const expectedChecksum = this.generateChecksum(parsed1);
        if (parsed1.checksum === expectedChecksum) {
          return parsed1;
        }
      }

      // If validation fails, reinitialize (possible tampering detected)
      console.warn('🚨 Possible data tampering detected! Reinitializing...');
      this.initializeStorage();
      return this.retrieveSecurely();
      
    } catch (e) {
      console.warn('Data retrieval error, reinitializing...');
      this.initializeStorage();
      return this.retrieveSecurely();
    }
  }

  // Check if two data objects match (for validation)
  private dataMatches(data1: any, data2: any): boolean {
    return (
      data1.totalCount === data2.totalCount &&
      data1.sessionStart === data2.sessionStart &&
      data1.mistakes.length === data2.mistakes.length
    );
  }

  // Add a new mistake (main public method)
  addMistake(type: string, description: string): number {
    const currentData = this.retrieveSecurely();
    
    const newMistake = {
      id: Date.now() + Math.random(),
      type,
      description,
      timestamp: Date.now(),
      userAgent: navigator.userAgent.substring(0, 50),
      url: window.location.href
    };

    currentData.mistakes.push(newMistake);
    currentData.totalCount = currentData.mistakes.length;
    currentData.lastUpdate = Date.now();
    currentData.checksum = this.generateChecksum(currentData);

    this.storeSecurely(currentData);

    console.log(`🚨 Mistake recorded: ${type} (Total: ${currentData.totalCount})`);
    return currentData.totalCount;
  }

  // Get mistake count (public method)
  getMistakeCount(): number {
    const data = this.retrieveSecurely();
    return data.totalCount;
  }

  // Get all mistakes (public method)
  getAllMistakes(): any[] {
    const data = this.retrieveSecurely();
    return data.mistakes;
  }

  // Get mistakes by type
  getMistakesByType(type: string): any[] {
    const data = this.retrieveSecurely();
    return data.mistakes.filter((m: any) => m.type === type);
  }

  // Clear all mistakes (admin only - requires special validation)
  clearMistakes(adminKey: string): boolean {
    if (adminKey === this.generateAdminKey()) {
      this.initializeStorage();
      return true;
    }
    console.warn('🚨 Unauthorized attempt to clear mistakes!');
    return false;
  }

  // Generate admin key for clearing (complex calculation)
  private generateAdminKey(): string {
    const date = new Date();
    const adminSeed = `admin_${date.getFullYear()}_${date.getMonth()}_${date.getDate()}`;
    return this.simpleHash(adminSeed + this.secretSalt);
  }
}

// Export singleton instance
export const mistakeTracker = SecureMistakeTracker.getInstance();

// Convenience functions
export const addMistake = (type: string, description: string) => mistakeTracker.addMistake(type, description);
export const getMistakeCount = () => mistakeTracker.getMistakeCount();
export const getAllMistakes = () => mistakeTracker.getAllMistakes();
