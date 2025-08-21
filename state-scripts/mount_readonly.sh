#!/bin/bash
# Mount ../djhatch as read-only at djhatch-readonly-mount/
# Provides safe access to implementation codebase for state management

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SOURCE_DIR="$PROJECT_ROOT/../djhatch"
MOUNT_POINT="$PROJECT_ROOT/djhatch-readonly-mount"

show_help() {
    echo "Usage: $0 [mount|unmount|status|fstab-check|help]"
    echo ""
    echo "Commands:"
    echo "  mount      - Mount ../djhatch as read-only"
    echo "  unmount    - Unmount the read-only mount"
    echo "  status     - Show current mount status"
    echo "  fstab-check - Check if entry exists in /etc/fstab"
    echo "  help       - Show this help message"
    echo ""
    echo "Mount point: $MOUNT_POINT"
    echo "Source: $SOURCE_DIR"
}

check_source() {
    if [ ! -d "$SOURCE_DIR" ]; then
        echo -e "${RED}❌ Source directory not found: $SOURCE_DIR${NC}"
        echo "Expected ../djhatch relative to djhatch-state/"
        exit 1
    fi
}

mount_readonly() {
    echo "=== Mounting Read-Only Codebase ==="
    
    check_source
    
    # Create mount point
    mkdir -p "$MOUNT_POINT"
    
    # Check if already mounted
    if mountpoint -q "$MOUNT_POINT" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Already mounted: $MOUNT_POINT${NC}"
        return 0
    fi
    
    echo "Source: $SOURCE_DIR"
    echo "Mount point: $MOUNT_POINT"
    
    # Bind mount
    echo "Creating bind mount..."
    sudo mount --bind "$SOURCE_DIR" "$MOUNT_POINT"
    
    # Make read-only
    echo "Setting read-only..."
    sudo mount -o remount,ro "$MOUNT_POINT"
    
    echo -e "${GREEN}✅ Successfully mounted as read-only${NC}"
    
    # Verify mount
    echo ""
    echo "Verification:"
    echo "  Mount point: $(mountpoint "$MOUNT_POINT" && echo "✅ Mounted" || echo "❌ Not mounted")"
    echo "  Contents: $(ls "$MOUNT_POINT" | wc -l) items"
    echo "  Read-only test:"
    if touch "$MOUNT_POINT/test-write" 2>/dev/null; then
        rm -f "$MOUNT_POINT/test-write"
        echo -e "${RED}    ❌ WARNING: Mount is writable!${NC}"
    else
        echo -e "${GREEN}    ✅ Read-only protection active${NC}"
    fi
}

unmount_readonly() {
    echo "=== Unmounting Read-Only Codebase ==="
    
    # Check if mounted
    if ! mountpoint -q "$MOUNT_POINT" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Not mounted: $MOUNT_POINT${NC}"
        return 0
    fi
    
    echo "Unmounting: $MOUNT_POINT"
    sudo umount "$MOUNT_POINT"
    
    echo -e "${GREEN}✅ Successfully unmounted${NC}"
}

show_status() {
    echo "=== Read-Only Mount Status ==="
    echo "Mount point: $MOUNT_POINT"
    echo "Source: $SOURCE_DIR"
    echo ""
    
    if mountpoint -q "$MOUNT_POINT" 2>/dev/null; then
        echo -e "${GREEN}✅ Status: Mounted${NC}"
        echo "  Contents: $(ls "$MOUNT_POINT" 2>/dev/null | wc -l) items"
        echo "  Mount info:"
        mount | grep "$MOUNT_POINT" | sed 's/^/    /'
        
        # Test read-only status
        if touch "$MOUNT_POINT/test-write" 2>/dev/null; then
            rm -f "$MOUNT_POINT/test-write"
            echo -e "${RED}  ❌ WARNING: Mount is writable!${NC}"
        else
            echo -e "${GREEN}  ✅ Read-only protection active${NC}"
        fi
    else
        echo -e "${RED}❌ Status: Not mounted${NC}"
        if [ -d "$MOUNT_POINT" ]; then
            echo "  Mount point exists but empty"
        else
            echo "  Mount point does not exist"
        fi
    fi
    
    # Check source
    if [ -d "$SOURCE_DIR" ]; then
        echo -e "${GREEN}✅ Source available: $SOURCE_DIR${NC}"
        echo "  Source contents: $(ls "$SOURCE_DIR" 2>/dev/null | wc -l) items"
    else
        echo -e "${RED}❌ Source not found: $SOURCE_DIR${NC}"
    fi
}

check_fstab() {
    echo "=== /etc/fstab Mount Entry Check ==="
    echo "Mount point: $MOUNT_POINT"
    echo "Source: $SOURCE_DIR"
    echo ""
    
    if grep -q "$MOUNT_POINT" /etc/fstab 2>/dev/null; then
        echo -e "${GREEN}✅ Entry found in /etc/fstab:${NC}"
        grep "$MOUNT_POINT" /etc/fstab | sed 's/^/  /'
        echo ""
        echo "💡 Mount will persist across reboots."
    else
        echo -e "${YELLOW}⚠️  No entry found in /etc/fstab${NC}"
        echo "💡 Use 'task mount-permanent' to add persistent mount."
    fi
}

# Main command handling
case "${1:-status}" in
    mount)
        mount_readonly
        ;;
    unmount)
        unmount_readonly
        ;;
    status)
        show_status
        ;;
    fstab-check)
        check_fstab
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac