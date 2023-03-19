# :gear: `fdfs` ![](https://github.com/onepeerlabs/fdfs/workflows/Tests/badge.svg)

## About
This action uploads file/build artifacts to a fairOS pod

This action can be run on `ubuntu-latest`, `windows-latest`, and `macos-latest` GitHub Actions runners.

## Usage

```yaml
steps:
- uses: onepeerlabs/fdfs@v0.0.6
  with:
    version:
      0.9.2
    path:
      build/*
  env:
    BEE: ${{secrets.BEE}}
    RPC: ${{secrets.RPC}}
    STAMP: ${{secrets.STAMP}}
    USER_NAME: ${{secrets.USER_NAME}}
    PASSWORD: ${{secrets.PASSWORD}}
    POD: ${{secrets.POD}}
    ROOT: ${{secrets.ROOT}}
```

## Inputs
The actions supports the following inputs:

- `version`: The version of `fairOS-dfs` to install, defaulting to `0.9.2`
- `path`: which files to upload to the pod

## License
[MIT](LICENSE).
