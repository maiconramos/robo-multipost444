import json
import os

filepath = 'apps/web/.open-next/server-functions/default/apps/web/handler.mjs.meta.json'

try:
    with open(filepath, 'r') as f:
        data = json.load(f)

    inputs = data.get('inputs', {})
    
    # Calculate size per package/category
    package_sizes = {}
    app_size = 0
    node_modules_size = 0

    for path, info in inputs.items():
        size = info.get('bytes', 0)
        
        if 'node_modules' in path:
            node_modules_size += size
            # Extract package name
            parts = path.split('node_modules/')
            if len(parts) > 1:
                pkg_part = parts[-1]
                if pkg_part.startswith('@'):
                    pkg_name = '/'.join(pkg_part.split('/')[:2])
                else:
                    pkg_name = pkg_part.split('/')[0]
                
                package_sizes[pkg_name] = package_sizes.get(pkg_name, 0) + size
        else:
            app_size += size

    # Sort packages by size descending
    sorted_packages = sorted(package_sizes.items(), key=lambda x: x[1], reverse=True)

    print(f"App Code Size: {app_size / 1024 / 1024:.2f} MB")
    print(f"Node Modules Size: {node_modules_size / 1024 / 1024:.2f} MB\n")

    print("\nTop 50 largest packages in bundle:")
    for name, size in sorted_packages[:50]:
        print(f"{size / 1024 / 1024:.2f} MB - {name}")

    # App files breakdown
    app_files = []
    for path, info in inputs.items():
        if 'node_modules' not in path:
            app_files.append({
                'path': path,
                'bytes': info.get('bytes', 0)
            })
    
    app_files.sort(key=lambda x: x['bytes'], reverse=True)
    print("\nTop 50 largest app files:")
    for f in app_files[:50]:
        print(f"{f['bytes'] / 1024 / 1024:.2f} MB - {f['path']}")

    total_size = sum(info.get('bytes', 0) for info in inputs.values())
    print(f"\nTotal inputs size: {total_size / 1024 / 1024:.2f} MB")
    print(f"Total number of input files: {len(inputs)}")

except Exception as e:
    print(f"Error: {e}")
