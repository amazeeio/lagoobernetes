{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "lagoobernetes-remote.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "lagoobernetes-remote.dockerHost.fullname" -}}
{{- .Values.dockerHost.name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "lagoobernetes-remote.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "lagoobernetes-remote.labels" -}}
helm.sh/chart: {{ include "lagoobernetes-remote.chart" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "lagoobernetes-remote.dockerHost.labels" -}}
helm.sh/chart: {{ include "lagoobernetes-remote.chart" . }}
{{ include "lagoobernetes-remote.dockerHost.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Selector labels
*/}}
{{- define "lagoobernetes-remote.dockerHost.selectorLabels" -}}
app.kubernetes.io/name: {{ include "lagoobernetes-remote.dockerHost.fullname" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Create the name of the service account to use
*/}}
{{- define "lagoobernetes-remote.dockerHost.serviceAccountName" -}}
{{- if .Values.dockerHost.serviceAccount.create -}}
    {{ default (include "lagoobernetes-remote.dockerHost.fullname" .) .Values.dockerHost.serviceAccount.name }}
{{- else -}}
    {{ default "default" .Values.dockerHost.serviceAccount.name }}
{{- end -}}
{{- end -}}


{{/*
Create the name of the service account to use
*/}}
{{- define "lagoobernetes-remote.kubernetesbuilddeploy.serviceAccountName" -}}
{{ .Values.kubernetesbuilddeploy.serviceAccountName }}
{{- end -}}