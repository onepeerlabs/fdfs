# :gear: `setup-gh` ![](https://github.com/github-developer/setup-gh/workflows/Tests/badge.svg)
> An example action, demonstrating how CLI authors may develop actions that allow setup their of CLIs on GitHub's  hosted runners, using JavaScript

## About
This action uploaded file/build artifacts to a fairOS pod

This action can be run on `ubuntu-latest`, `windows-latest`, and `macos-latest` GitHub Actions runners.

## Usage

```yaml
steps:
- uses: onepeerlabs/fdfs@v0.0.4
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
