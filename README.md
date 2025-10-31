<div align="center">

# stepci-captured-runner

### {tagline}

</div>

<p align="center">
  <a href="https://dyne.org">
    <img src="https://files.dyne.org/software_by_dyne.png" width="170">
  </a>
</p>

---

<br><br>

## stepci-captured-runner Features

### 🚩 Table of Contents

- [💾 Install](#-install)
- [🎮 Quick start](#-quick-start)
- [🔌 Capture Plugin](#-capture-plugin)
- [🚑 Community & support](#-community--support)
- [🐋 Docker](#-docker)
- [🐝 API](#-api)
- [🔧 Configuration](#-configuration)
- [📋 Testing](#-testing)
- [🐛 Troubleshooting & debugging](#-troubleshooting--debugging)
- [😍 Acknowledgements](#-acknowledgements)
- [👤 Contributing](#-contributing)
- [💼 License](#-license)

</div>

---

## 💾 Install

`bun i`

**[🔝 back to top](#toc)**

---

## 🎮 Quick start

To start using `stepci-captured-runner`, follow these steps:

```bash
git clone
cd stepci-captured-runner
bun i
```
This will clone the repository and install the necessary dependencies.

then, you can run the following command to start the runner:

```bash
bun start --path yourfile.yaml
```

1. **Bundle the code**:

   After installing the dependencies, you can bundle the code to create a standalone js executable. This step is optional but recommended for better performance and portability.

   ```bash
   bun i
   bun run build
   ```

2. **Run the bundle**:

   After building, you can run the generated executable:

   ```bash
   bun run ./dist/stepci-runner --path yourfile.yaml
   ```

   You can replace `yourfile.yaml` with the path to your StepCI YAML file.


## 🚀 Commands & Usage

- `--path <file>`: Specify the path to the test file.
- `--secret <key=value...>`: Provide secrets as key-value pairs.
- `--env <key=value...>`: Provide environment variables as key-value pairs.
- `-h, --human-readable`: Display the output in a human-readable format.

For more information on using the available options, run:

```bash
stepci-runner --help
```

**[🔝 back to top](#toc)**

---

## 🔌 Capture Plugin

The `stepci-captured-runner` includes a built-in capture plugin that allows you to transform and store captured values during workflow execution.

### Usage

The capture plugin can be used in your StepCI YAML workflow files to manipulate captured data:

```yaml
version: "1.1"
name: Example Workflow

tests:
  example-test:
    steps:
      - name: "Fetch data"
        http:
          method: GET
          url: https://api.example.com/data
          captures:
            rawData:
              jsonpath: $.data
      
      - name: "Transform captured data"
        plugin:
          id: 'capture-plugin'
          params:
            values:
              processedData: "${{captures.rawData|slice:10}}"
              customField: "some-value"
```

**[🔝 back to top](#toc)**

---

## 🚑 Community & support

**[📝 Documentation](#toc)** - Getting started and more.

**[🌱 Ecosystem](https://github.com/dyne/ecosystem)** - Plugins, resources, and more.

**[🚩 Issues](../../issues)** - Bugs end errors you encounter using {project_name}.

**[💬 Discussions](../../discussions)** - Get help, ask questions, request features, and discuss {project_name}.

**[[] Matrix](https://socials.dyne.org/matrix)** - Hanging out with the community.

**[🗣️ Discord](https://socials.dyne.org/discord)** - Hanging out with the community.

**[🪁 Telegram](https://socials.dyne.org/telegram)** - Hanging out with the community.

**[📖 Example](https://github.com/{project_name}/example)** - An example repository that uses {project_name}.

**[🔝 back to top](#toc)**

## 😍 Acknowledgements

<a href="https://dyne.org">
  <img src="https://files.dyne.org/software_by_dyne.png" width="222">
</a>

Copyleft 🄯 2023 by [Dyne.org](https://www.dyne.org) foundation, Amsterdam

Designed, written and maintained by Puria Nafisi Azizi.

Special thanks to Mr. W. White for his special contributions.

**[🔝 back to top](#toc)**

---

## 👤 Contributing

Please first take a look at the [Dyne.org - Contributor License Agreement](CONTRIBUTING.md) then

1.  🔀 [FORK IT](../../fork)
2.  Create your feature branch `git checkout -b feature/branch`
3.  Commit your changes `git commit -am 'feat: New feature\ncloses #398'`
4.  Push to the branch `git push origin feature/branch`
5.  Create a new Pull Request `gh pr create -f`
6.  🙏 Thank you

**[🔝 back to top](#toc)**

---

## 💼 License

    {project_name} - {tagline}
    Copyleft 🄯 2023 Dyne.org foundation, Amsterdam

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

**[🔝 back to top](#toc)**
